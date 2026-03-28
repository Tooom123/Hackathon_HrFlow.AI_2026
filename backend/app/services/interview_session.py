"""Interview session orchestrator.

State machine that coordinates VAD → STT → LLM → TTS pipeline.
Each session manages the lifecycle of one candidate interview.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.schemas.interview import (
    Answer,
    InterviewSession,
    SessionState,
)
from app.services.llm_service import LLMDecision, LLMService
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.vad_service import VADService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SessionEvent:
    """Emitted when a meaningful state change occurs."""

    new_state: SessionState
    transcript: str | None = None
    question_text: str | None = None
    audio: bytes | None = None
    evaluation: str | None = None
    score: int | None = None
    global_score: float | None = None  # set only when new_state == DONE


@dataclass
class SessionOrchestrator:
    """Orchestrates the full interview pipeline for one session."""

    session: InterviewSession
    vad: VADService
    stt: STTService
    tts: TTSService
    llm: LLMService
    job_context: str = ""
    _follow_up_used: bool = field(default=False, init=False)

    async def start(self) -> SessionEvent:
        """Initialize session: generate intro audio, transition to ASKING."""
        question = self.session.current_question
        if question is None:
            self.session.state = SessionState.DONE
            return SessionEvent(new_state=SessionState.DONE)

        intro_text = await self.llm.generate_introduction(self.job_context)
        full_text = f"{intro_text} Première question : {question.text}"

        audio = await self.tts.synthesize(full_text)
        self.session.state = SessionState.ASKING
        self.vad.reset()

        return SessionEvent(
            new_state=SessionState.ASKING,
            question_text=full_text,
            audio=audio,
        )

    async def handle_audio_chunk(self, chunk: bytes) -> SessionEvent | None:
        """Process an incoming audio chunk from the candidate."""
        if self.session.state == SessionState.ASKING:
            self.session.state = SessionState.LISTENING

        if self.session.state != SessionState.LISTENING:
            return None

        result = await self.vad.feed_chunk(chunk)
        if result is None:
            return None

        audio_segment, duration_s = result
        self.session.state = SessionState.PROCESSING
        return await self._process_speech_segment(audio_segment, duration_s)

    async def handle_mock_answer(self, text: str) -> SessionEvent:
        """Bypass VAD/STT and directly process a text answer (test mode only)."""
        self.session.state = SessionState.PROCESSING
        logger.info("Mock answer [Q%d]: %s", self.session.current_question_index, text)
        return await self._evaluate_and_advance(
            transcript=text,
            audio_duration_s=0.0,
        )

    async def _process_speech_segment(
        self, audio: bytes, duration_s: float
    ) -> SessionEvent:
        """Transcribe → evaluate → decide next action."""
        transcription = await self.stt.transcribe(audio)
        logger.info(
            "Transcription [Q%d]: %s",
            self.session.current_question_index,
            transcription.text,
        )
        return await self._evaluate_and_advance(
            transcript=transcription.text,
            audio_duration_s=duration_s,
        )

    async def _evaluate_and_advance(
        self, transcript: str, audio_duration_s: float
    ) -> SessionEvent:
        """Common path: evaluate transcript → store answer → decide next action."""
        question = self.session.current_question
        if question is None:
            return await self._finish()

        evaluation = await self.llm.evaluate_answer(
            question_text=question.text,
            candidate_answer=transcript,
            job_context=self.job_context,
        )

        answer = Answer(
            question_id=question.id,
            transcript=transcript,
            audio_duration_s=audio_duration_s,
            llm_evaluation=evaluation.evaluation,
            score=evaluation.score,
            follow_up_asked=(evaluation.decision == LLMDecision.FOLLOW_UP),
        )
        self.session.answers.append(answer)

        if (
            evaluation.decision == LLMDecision.FOLLOW_UP
            and not self._follow_up_used
            and evaluation.follow_up_text
        ):
            self._follow_up_used = True
            event = await self._ask_question(evaluation.follow_up_text)
            return SessionEvent(
                **{**event.__dict__, "transcript": transcript, "evaluation": evaluation.evaluation, "score": evaluation.score}
            )

        return await self._advance_and_ask(transcript, evaluation.evaluation, evaluation.score)

    async def _advance_and_ask(
        self, transcript: str, evaluation: str, score: int
    ) -> SessionEvent:
        """Move to next question and ask it, or finish."""
        self.session.current_question_index += 1
        self._follow_up_used = False

        question = self.session.current_question
        if question is None:
            return await self._finish(transcript, evaluation, score)

        event = await self._ask_question(question.text)
        return SessionEvent(
            new_state=event.new_state,
            transcript=transcript,
            evaluation=evaluation,
            score=score,
            question_text=event.question_text,
            audio=event.audio,
        )

    async def _finish(
        self,
        transcript: str | None = None,
        evaluation: str | None = None,
        score: int | None = None,
    ) -> SessionEvent:
        """Mark session as DONE and save results to HrFlow profile."""
        self.session.state = SessionState.DONE
        global_score = self._compute_global_score()

        await self._persist_to_hrflow(global_score)

        return SessionEvent(
            new_state=SessionState.DONE,
            transcript=transcript,
            evaluation=evaluation,
            score=score,
            global_score=global_score,
        )

    def _compute_global_score(self) -> float:
        """Compute average score across all answers (ignoring follow-up duplicates)."""
        scores = [a.score for a in self.session.answers if not a.follow_up_asked]
        if not scores:
            scores = [a.score for a in self.session.answers]
        return round(sum(scores) / len(scores), 1) if scores else 0.0

    async def _persist_to_hrflow(self, global_score: float) -> None:
        """Save interview results to HrFlow profile metadata."""
        profile_reference = self.session.candidate_profile_reference
        if not profile_reference or profile_reference == "test-bypass":
            logger.info("[persist] Skipping HrFlow save (no real profile_reference)")
            return

        from app.services.hrflow_service import HrFlowService

        hrflow = HrFlowService()
        answers_payload = [
            {
                "question": self.session.questions[int(a.question_id)].text
                if int(a.question_id) < len(self.session.questions) else "",
                "transcript": a.transcript,
                "score": a.score,
                "evaluation": a.llm_evaluation,
            }
            for a in self.session.answers
        ]

        try:
            await hrflow.save_interview_to_profile(
                profile_reference=profile_reference,
                answers=answers_payload,
                global_score=global_score,
            )
        except Exception:
            logger.exception("[persist] Failed to save interview results to HrFlow profile")

    async def _ask_question(self, text: str) -> SessionEvent:
        """Synthesize a question/follow-up into audio and update state."""
        audio = await self.tts.synthesize(text)
        self.vad.reset()
        self.session.state = SessionState.ASKING

        return SessionEvent(
            new_state=SessionState.ASKING,
            question_text=text,
            audio=audio,
        )
