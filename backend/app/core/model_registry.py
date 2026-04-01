"""Global model registry — load once at startup, reuse across sessions.

TTS, STT, and Silero VAD are heavy models that take time to load.
This module holds a single instance of each, initialized during app startup.
STT (Whisper) is shared across sessions (read-only inference, thread-safe).
"""

from __future__ import annotations

import logging

from app.core.config import settings
from app.services.tts_service import TTSConfig, TTSService
from app.services.vad_service import VADConfig, VADService

logger = logging.getLogger(__name__)

_tts: TTSService | None = None
_stt = None  # STTService instance, loaded at startup
_vad_config: VADConfig | None = None  # VAD is stateful per-session, only config is shared


async def load_models() -> None:
    """Load all heavy models into memory. Call once at app startup."""
    global _tts, _stt, _vad_config

    logger.info("[registry] Initializing TTS (Edge-TTS, voice=%s)...", settings.tts_voice)
    try:
        _tts = TTSService(TTSConfig(
            voice=settings.tts_voice,
            sample_rate=settings.tts_sample_rate,
            chunk_size=settings.tts_chunk_size,
        ))
        logger.info("[registry] TTS ready.")
    except Exception as exc:
        logger.warning("[registry] TTS model failed to load (%s) — TTS will be unavailable", exc)
        _tts = None

    logger.info("[registry] Loading STT model (faster-whisper %s)...", settings.whisper_model)
    try:
        from app.services.stt_service_faster import STTConfig, STTService
        stt_instance = STTService(STTConfig(
            model_name=settings.whisper_model,
            language=settings.whisper_language,
        ))
        await stt_instance.load_model()
        _stt = stt_instance
        logger.info("[registry] STT model ready.")
    except Exception as exc:
        logger.warning("[registry] STT model failed to load (%s) — STT will be unavailable", exc)
        _stt = None

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


def get_stt():
    """Return the shared STT service instance (loaded at startup)."""
    if _stt is None:
        raise RuntimeError("STT model not loaded — app startup incomplete")
    return _stt


def get_vad_config() -> VADConfig:
    if _vad_config is None:
        raise RuntimeError("VAD config not set — app startup incomplete")
    return _vad_config
