from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.hrflow import get_hrflow_service
from app.schemas.job import AskJobRequest, JobFromTextRequest, ParseTextRequest, SaveQuestionsRequest, SetupJobRequest, SetupJobResponse
from app.services.hrflow_service import HrFlowService

router = APIRouter(prefix="/hrflow", tags=["hrflow"])


@router.get("/ping")
async def ping_hrflow(service: HrFlowService = Depends(get_hrflow_service)) -> dict:
    """Test HrFlow API connectivity. Returns 200 + workspace info if credentials are valid."""
    try:
        data = await service.check_connection()
        return {"status": "connected", "data": data}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"HrFlow API unreachable: {exc}")


@router.post("/jobs/parse")
async def parse_job_text(
    body: ParseTextRequest,
    service: HrFlowService = Depends(get_hrflow_service),
) -> dict:
    """Parse un texte brut et retourne les champs structurés extraits (skills, locations…)."""
    try:
        return await service.parse_text(body.text, language=body.language)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/jobs/setup", status_code=201, response_model=SetupJobResponse)
async def setup_job_interview(
    body: SetupJobRequest,
    service: HrFlowService = Depends(get_hrflow_service),
) -> SetupJobResponse:
    """Flow RH complet : parse le texte → indexe le job → génère N questions techniques."""
    try:
        result = await service.setup_job_interview(
            text=body.text,
            title=body.title,
            question_count=body.question_count,
            board_key=body.board_key,
        )
        return SetupJobResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.put("/jobs/questions")
async def save_questions(
    body: SaveQuestionsRequest,
    service: HrFlowService = Depends(get_hrflow_service),
) -> dict:
    """Sauvegarde les questions finales comme metadata du job indexé."""
    try:
        return await service.save_questions_to_job(
            job_key=body.job_key,
            questions=body.questions,
            job_title=body.job_title,
            board_key=body.board_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/jobs/ask")
async def ask_job(
    body: AskJobRequest,
    service: HrFlowService = Depends(get_hrflow_service),
) -> dict:
    """Pose un prompt (question libre) à un job indexé sur le board."""
    try:
        return await service.ask_job(
            prompt=body.prompt,
            board_key=body.board_key,
            job_key=body.job_key,
            job_reference=body.job_reference,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/jobs", status_code=201)
async def create_job_from_text(
    body: JobFromTextRequest,
    service: HrFlowService = Depends(get_hrflow_service),
) -> dict:
    """Flow complet RH : parse le texte brut → construit le job → l'indexe sur le board."""
    try:
        result = await service.create_job_from_text(
            text=body.text,
            title=body.title,
            board_key=body.board_key,
            reference=body.reference,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
