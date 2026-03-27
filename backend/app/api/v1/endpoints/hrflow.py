from fastapi import APIRouter


router = APIRouter(prefix="/hrflow", tags=["hrflow"])


@router.get("/health")
def hrflow_healthcheck() -> dict[str, str]:
    return {"status": "ok"}
