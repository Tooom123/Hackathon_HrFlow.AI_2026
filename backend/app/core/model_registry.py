"""Global model registry — load once at startup, reuse across sessions.

Chatterbox TTS and Silero VAD are heavy models that take 20-30s to load.
This module holds a single instance of each, initialized during app startup.
"""

from __future__ import annotations

import logging

from app.core.config import settings
from app.services.tts_service import TTSConfig, TTSService
from app.services.vad_service import VADConfig, VADService

logger = logging.getLogger(__name__)

_tts: TTSService | None = None
_vad_config: VADConfig | None = None  # VAD is stateful per-session, only config is shared


async def load_models() -> None:
    """Load all heavy models into memory. Call once at app startup."""
    global _tts, _vad_config

    logger.info("[registry] Initializing TTS (Edge-TTS, voice=%s)...", settings.tts_voice)
    _tts = TTSService(TTSConfig(
        voice=settings.tts_voice,
        sample_rate=settings.tts_sample_rate,
        chunk_size=settings.tts_chunk_size,
    ))
    logger.info("[registry] TTS ready.")

    _vad_config = VADConfig(
        threshold=settings.vad_threshold,
        input_sample_rate=settings.vad_input_sample_rate,
        min_silence_duration_ms=settings.vad_min_silence_ms,
        min_speech_duration_ms=settings.vad_min_speech_ms,
    )
    logger.info("[registry] VAD config ready.")


def get_tts() -> TTSService:
    if _tts is None:
        raise RuntimeError("TTS model not loaded — app startup incomplete")
    return _tts


def get_vad_config() -> VADConfig:
    if _vad_config is None:
        raise RuntimeError("VAD config not set — app startup incomplete")
    return _vad_config
