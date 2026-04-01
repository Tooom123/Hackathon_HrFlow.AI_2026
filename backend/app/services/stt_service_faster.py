"""Speech-to-Text service using faster-whisper (CUDA / CPU).

Drop-in replacement for stt_service.py on Linux/Windows (non-Apple) platforms.
Runs on GPU (CUDA) with an NVIDIA card, falls back to CPU otherwise.
"""

from __future__ import annotations

import asyncio
import io
import tempfile
import wave
from dataclasses import dataclass


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    language: str
    duration_s: float


@dataclass
class STTConfig:
    model_name: str = "large-v3-turbo"
    language: str = "fr"
    sample_rate: int = 16_000
    device: str = "cuda"         # "cuda" avec NVIDIA, "cpu" sinon
    compute_type: str = "float16"  # "int8" si VRAM insuffisante


class STTService:
    """Wraps faster-whisper for local speech-to-text transcription."""

    def __init__(self, config: STTConfig | None = None) -> None:
        self._config = config or STTConfig()
        self._model = None

    async def load_model(self) -> None:
        """Load the Whisper model. Call once at startup."""
        loop = asyncio.get_event_loop()
        self._model = await loop.run_in_executor(None, self._load)

    def _load(self):
        from faster_whisper import WhisperModel
        return WhisperModel(
            self._config.model_name,
            device=self._config.device,
            compute_type=self._config.compute_type,
        )

    async def transcribe(self, audio: bytes) -> TranscriptionResult:
        """Transcribe a complete audio segment to text.

        Args:
            audio: Raw PCM 16-bit 16 kHz mono audio bytes.

        Returns:
            TranscriptionResult with the transcribed text.
        """
        if self._model is None:
            raise RuntimeError("STT model not loaded — call load_model() first")

        duration_s = len(audio) / (2 * self._config.sample_rate)
        wav_buffer = self._pcm_to_wav(audio)

        result = await asyncio.get_event_loop().run_in_executor(
            None, self._run_whisper, wav_buffer,
        )

        return TranscriptionResult(
            text=result["text"],
            language=result["language"],
            duration_s=duration_s,
        )

    def _pcm_to_wav(self, pcm_data: bytes) -> bytes:
        """Convert raw PCM 16-bit mono to WAV format."""
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self._config.sample_rate)
            wf.writeframes(pcm_data)
        return buf.getvalue()

    def _run_whisper(self, wav_data: bytes) -> dict:
        """Run faster-whisper transcription (blocking, run in executor)."""
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
            tmp.write(wav_data)
            tmp.flush()
            segments, info = self._model.transcribe(
                tmp.name,
                language=self._config.language,
            )
            text = " ".join(s.text for s in segments).strip()
            return {"text": text, "language": info.language}
