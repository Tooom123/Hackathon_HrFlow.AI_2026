from typing import Optional
from pydantic import BaseModel


class ApplyCVResponse(BaseModel):
    profile_key: Optional[str]
    profile_reference: Optional[str]
    job_key: str
    board_key: str
    source_key: str
    message: str
