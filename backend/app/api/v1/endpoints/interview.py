"""Interview session endpoints.

Flow:
1. Recruiter:  POST /interview/sessions          → creates session + link
2. Candidate:  POST /interview/sessions/{id}/join → attaches profile after CV upload
3. Candidate:  WS   /interview/ws/{id}            → real-time TTS interview
4. Anyone:     GET  /interview/sessions/{id}      → session status & results
"""

from __future__ import annotations

import json
import logging
import uuid
from base64 import b64encode
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.core.config import settings
from app.dependencies.hrflow import get_hrflow_service
from app.schemas.interview import (
    InterviewSession,
    Question,
    SessionState,
    WSMessageType,
)
from app.services.hrflow_service import HrFlowService

if TYPE_CHECKING:
    from app.services.interview_session import SessionOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["interview"])

# In-memory session store (swap for DB/Redis in prod)
_sessions: dict[str, InterviewSession] = {}
_orchestrators: dict[str, SessionOrchestrator] = {}


# ------------------------------------------------------------------
# REST endpoints
# ------------------------------------------------------------------


@router.get("/sessions")
async def list_sessions_for_job(job_key: str) -> dict:
    """Return the most recent waiting session for a given job, if any."""
    matches = [
        s for s in _sessions.values()
        if s.job_key == job_key and s.state == SessionState.WAITING
    ]
    if not matches:
        return {"session": None}
    latest = max(matches, key=lambda s: s.session_id)
    return {
        "session": {
            "session_id": latest.session_id,
            "job_key": latest.job_key,
            "job_title": latest.job_title,
            "state": latest.state.value,
            "total_questions": len(latest.questions),
            "candidate_link": f"{settings.frontend_base_url}/session/{latest.session_id}",
        }
    }


@router.post("/sessions", status_code=201)
async def create_session(
    job_key: str,
    service: HrFlowService = Depends(get_hrflow_service),
) -> dict:
    """Recruiter creates an interview session for a job.

    Loads the 20 pre-generated questions from HrFlow job metadata
    (question_0 … question_19) and returns a shareable candidate link.
    """
    questions_texts, job_title = await service.get_job_questions(job_key)
    if not questions_texts:
        raise HTTPException(
            status_code=422,
            detail="No questions found in job metadata. Run /hrflow/jobs/setup first.",
        )

    session_id = str(uuid.uuid4())
    questions = [
        Question(id=str(i), text=text)
        for i, text in enumerate(questions_texts)
    ]

    session = InterviewSession(
        session_id=session_id,
        job_key=job_key,
        job_title=job_title,
        questions=questions,
    )
    _sessions[session_id] = session

    return {
        "session_id": session_id,
        "job_key": job_key,
        "job_title": job_title,
        "state": session.state.value,
        "total_questions": len(questions),
        "candidate_link": f"{settings.frontend_base_url}/session/{session_id}",
    }


@router.post("/sessions/{session_id}/join")
async def join_session(
    session_id: str,
    profile_reference: str,
    candidate_email: str | None = None,
) -> dict:
    """Candidate joins a session after uploading their CV.

    The profile_reference comes from POST /profiles/apply.
    This endpoint attaches the candidate to the session and
    initializes the AI services (VAD, STT, TTS, LLM).
    """
    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.state != SessionState.WAITING:
        raise HTTPException(status_code=409, detail="Session already joined or started")

    session.candidate_profile_reference = profile_reference
    if candidate_email:
        session.candidate_email = candidate_email
    session.state = SessionState.READY

    # Initialize AI services & orchestrator
    orchestrator = await _init_orchestrator(session)
    _orchestrators[session_id] = orchestrator

    return {
        "session_id": session_id,
        "state": session.state.value,
        "total_questions": len(session.questions),
        "ws_url": f"/interview/ws/{session_id}",
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> dict:
    """Get current session state, progress, and results."""
    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session.session_id,
        "job_key": session.job_key,
        "job_title": session.job_title,
        "state": session.state.value,
        "candidate_profile_reference": session.candidate_profile_reference,
        "current_question_index": session.current_question_index,
        "total_questions": len(session.questions),
        "answers_count": len(session.answers),
        "global_score": round(sum(a.score for a in session.answers) / len(session.answers), 1) if session.answers else None,
        "answers": [
            {
                "question_id": a.question_id,
                "question": session.questions[int(a.question_id)].text if int(a.question_id) < len(session.questions) else "",
                "transcript": a.transcript,
                "score": a.score,
                "evaluation": a.llm_evaluation,
                "follow_up_asked": a.follow_up_asked,
            }
            for a in session.answers
        ],
    }


# ------------------------------------------------------------------
# WebSocket
# ------------------------------------------------------------------


@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str) -> None:
    """Bidirectional audio WebSocket for the TTS interview.

    Only works after the candidate has joined the session (state == READY).
    """
    session = _sessions.get(session_id)
    orchestrator = _orchestrators.get(session_id)

    if session is None or orchestrator is None:
        await websocket.close(code=4004, reason="Session not found")
        return

    if session.state not in (SessionState.READY, SessionState.ASKING, SessionState.LISTENING):
        await websocket.close(code=4003, reason=f"Session not joinable (state={session.state.value})")
        return

    await websocket.accept()
    logger.info("WebSocket connected for session %s", session_id)

    try:
        # Start interview: send intro + first question
        event = await orchestrator.start()
        await _send_json(websocket, WSMessageType.STATE_CHANGE, {
            "state": event.new_state.value,
        })
        if event.question_text:
            await _send_json(websocket, WSMessageType.QUESTION_TEXT, {
                "text": event.question_text,
            })
        if event.audio:
            await _send_audio(websocket, event.audio)

        # Signal client: ready to receive audio
        await _send_json(websocket, WSMessageType.STATE_CHANGE, {
            "state": SessionState.LISTENING.value,
        })

        # Main loop: receive audio chunks or mock text answers
        while session.state != SessionState.DONE:
            raw = await websocket.receive()
            if raw["type"] == "websocket.disconnect":
                logger.info("WebSocket disconnected for session %s", session_id)
                return

            # Mock mode: client sends {"type": "mock_answer", "text": "..."}
            if raw["type"] == "websocket.receive" and raw.get("text"):
                try:
                    msg = json.loads(raw["text"])
                except (json.JSONDecodeError, TypeError):
                    msg = {}

                if msg.get("type") == "mock_answer":
                    event = await orchestrator.handle_mock_answer(msg.get("text", ""))
                else:
                    continue
            elif raw["type"] == "websocket.receive" and raw.get("bytes"):
                event = await orchestrator.handle_audio_chunk(raw["bytes"])
            else:
                continue

            if event is None:
                continue

            await _send_json(websocket, WSMessageType.STATE_CHANGE, {
                "state": event.new_state.value,
            })

            if event.transcript:
                await _send_json(websocket, WSMessageType.TRANSCRIPT, {
                    "text": event.transcript,
                })

            if event.evaluation:
                await _send_json(websocket, WSMessageType.STATE_CHANGE, {
                    "state": event.new_state.value,
                    "evaluation": event.evaluation,
                })

            if event.question_text:
                await _send_json(websocket, WSMessageType.QUESTION_TEXT, {
                    "text": event.question_text,
                })

            if event.audio:
                await _send_audio(websocket, event.audio)

            if event.new_state == SessionState.ASKING:
                await _send_json(websocket, WSMessageType.STATE_CHANGE, {
                    "state": SessionState.LISTENING.value,
                })

        # Interview complete
        global_score = sum(a.score for a in session.answers) / len(session.answers) if session.answers else 0
        await _send_json(websocket, WSMessageType.STATE_CHANGE, {
            "state": SessionState.DONE.value,
            "total_answers": len(session.answers),
            "global_score": round(global_score, 1),
        })
        await _close_websocket(websocket)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for session %s", session_id)
    except Exception:
        logger.exception("Error in interview WebSocket for session %s", session_id)
        if _can_send(websocket):
            await _send_json(websocket, WSMessageType.ERROR, {
                "message": "Internal server error",
            })
        await _close_websocket(websocket, code=1011)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


async def _init_orchestrator(session: InterviewSession) -> SessionOrchestrator:
    """Build AI services and create the session orchestrator.

    TTS and STT are shared singletons loaded at startup (heavy models).
    VAD is per-session (stateful). LLM is lightweight (HTTP calls to Ollama).
    """
    from app.core.model_registry import get_stt, get_tts, get_vad_config
    from app.services.interview_session import SessionOrchestrator
    from app.services.llm_service import LLMConfig, LLMService
    from app.services.vad_service import VADService

    # Per-session VAD (stateful — each session needs its own instance)
    vad = VADService(get_vad_config())
    await vad.load_model()

    # Shared singletons — already loaded at startup
    stt = get_stt()
    tts = get_tts()

    llm = LLMService(LLMConfig(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
        temperature=settings.ollama_temperature,
    ))

    return SessionOrchestrator(
        session=session,
        vad=vad,
        stt=stt,
        tts=tts,
        llm=llm,
        job_context=session.job_title,
    )


async def _send_json(ws: WebSocket, msg_type: WSMessageType, data: dict) -> None:
    if not _can_send(ws):
        return
    await ws.send_json({"type": msg_type.value, **data})


async def _send_audio(ws: WebSocket, audio: bytes) -> None:
    """Send audio in chunks to avoid WebSocket frame size limits."""
    if not _can_send(ws):
        return

    chunk_size = settings.tts_chunk_size
    total_chunks = (len(audio) + chunk_size - 1) // chunk_size

    for i in range(0, len(audio), chunk_size):
        if not _can_send(ws):
            return
        chunk = audio[i : i + chunk_size]
        await ws.send_json({
            "type": WSMessageType.AUDIO_CHUNK.value,
            "audio": b64encode(chunk).decode("ascii"),
            "chunk_index": i // chunk_size,
            "total_chunks": total_chunks,
            "format": "pcm_s16le",
            "sample_rate": settings.tts_sample_rate,
        })


def _can_send(ws: WebSocket) -> bool:
    return (
        ws.application_state != WebSocketState.DISCONNECTED
        and ws.client_state != WebSocketState.DISCONNECTED
    )


async def _close_websocket(ws: WebSocket, code: int = 1000) -> None:
    if ws.application_state == WebSocketState.DISCONNECTED:
        return

    try:
        await ws.close(code=code)
    except RuntimeError:
        logger.debug("WebSocket already closed while attempting close")
