from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.hrflow import get_hrflow_service
from app.schemas.job import JobFromTextRequest, ParseTextRequest
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
