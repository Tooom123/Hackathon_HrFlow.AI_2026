from fastapi import APIRouter


api_router = APIRouter()


@api_router.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
