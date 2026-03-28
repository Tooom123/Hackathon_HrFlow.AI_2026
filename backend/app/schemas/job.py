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


class SetupJobRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Texte brut de l'offre d'emploi")
    title: str = Field(..., min_length=1, description="Intitulé du poste")
    question_count: int = Field(default=5, ge=1, le=20, description="Nombre de questions techniques à générer")
    board_key: Optional[str] = Field(None, description="Clé du board (utilise HRFLOW_BOARD_KEY par défaut)")


class SetupJobResponse(BaseModel):
    job_key: str
    job_reference: str
    job_title: str
    questions: list[str]


class SaveQuestionsRequest(BaseModel):
    job_key: str = Field(..., min_length=1)
    job_title: str = Field(..., min_length=1)
    questions: list[str] = Field(..., description="Questions dans l'ordre final")
    board_key: Optional[str] = None
