from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class SessionState(str, Enum):
    WAITING = "waiting"          # Session created by recruiter, waiting for candidate
    READY = "ready"              # Candidate joined (CV uploaded), ready to start TTS
    ASKING = "asking"            # AI is asking a question (TTS playing)
    LISTENING = "listening"      # Candidate is speaking (VAD active)
    PROCESSING = "processing"   # Transcribing + evaluating
    DONE = "done"                # Interview finished


class WSMessageType(str, Enum):
    AUDIO_CHUNK = "audio_chunk"
    STATE_CHANGE = "state_change"
    TRANSCRIPT = "transcript"
    QUESTION_TEXT = "question_text"
    ERROR = "error"


@dataclass(frozen=True)
class Question:
    id: str
    text: str


@dataclass(frozen=True)
class Answer:
    question_id: str
    transcript: str
    audio_duration_s: float
    llm_evaluation: str
    score: int  # 0-10
    follow_up_asked: bool


@dataclass
class InterviewSession:
    session_id: str
    job_key: str
    job_title: str
    questions: list[Question]
    state: SessionState = SessionState.WAITING
    candidate_profile_reference: Optional[str] = None
    current_question_index: int = 0
    answers: list[Answer] = field(default_factory=list)

    @property
    def current_question(self) -> Question | None:
        if self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None

    @property
    def is_finished(self) -> bool:
        return self.current_question_index >= len(self.questions)


@dataclass(frozen=True)
class WSMessage:
    type: WSMessageType
    data: dict | bytes
