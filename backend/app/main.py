from fastapi import FastAPI

from app.api.v1.router import api_router


app = FastAPI(
    title="Hackathon HrFlow.AI 2026 API",
    version="0.1.0",
)

app.include_router(api_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "API is running"}
