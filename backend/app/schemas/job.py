from typing import Optional
from pydantic import BaseModel, Field


class ParseTextRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: str = "fr"


class AskJobRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    board_key: Optional[str] = None
    job_key: Optional[str] = None
    job_reference: Optional[str] = None


class JobFromTextRequest(BaseModel):
    text: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    board_key: Optional[str] = None
    reference: Optional[str] = None
