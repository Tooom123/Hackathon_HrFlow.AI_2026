"""Text-to-Speech service using Microsoft Edge-TTS.

Converts text (questions, follow-ups) into audio chunks that can be
streamed back to the client over WebSocket.

Voices available for French:
  - fr-FR-HenriNeural   (male)
  - fr-FR-DeniseNeural  (female)
"""

from __future__ import annotations

import io
import struct
from collections.abc import AsyncIterator
from dataclasses import dataclass

import edge_tts


@dataclass
class TTSConfig:
    voice: str = "fr-FR-HenriNeural"
    sample_rate: int = 24_000
    chunk_size: int = 4096  # bytes per streamed chunk


class TTSService:
    """Wraps Edge-TTS for cloud text-to-speech synthesis in French."""

    def __init__(self, config: TTSConfig | None = None) -> None:
        self._config = config or TTSConfig()

    async def load_model(self) -> None:
        """No-op — Edge-TTS is a cloud service, no local model to load."""

    async def synthesize(self, text: str) -> bytes:
        """Synthesize full audio from text.

        Returns:
            Raw PCM 16-bit audio bytes at configured sample_rate.
        """
        communicate = edge_tts.Communicate(
            text,
            voice=self._config.voice,
        )

        # Edge-TTS returns MP3 by default — collect full MP3 then convert
        mp3_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_data += chunk["data"]

        if not mp3_data:
            return b""

        return self._mp3_to_pcm(mp3_data)

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        """Synthesize audio and yield chunks for streaming."""
        full_audio = await self.synthesize(text)
        chunk_size = self._config.chunk_size

        for i in range(0, len(full_audio), chunk_size):
            yield full_audio[i : i + chunk_size]

    def _mp3_to_pcm(self, mp3_data: bytes) -> bytes:
        """Convert MP3 bytes to PCM 16-bit mono at target sample rate."""
        import torch
        import torchaudio

        mp3_buffer = io.BytesIO(mp3_data)
        waveform, sr = torchaudio.load(mp3_buffer, format="mp3")

        # Convert to mono
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        # Resample to target rate
        if sr != self._config.sample_rate:
            waveform = torchaudio.functional.resample(waveform, sr, self._config.sample_rate)

        # Float32 [-1, 1] → PCM int16
        waveform = waveform.squeeze(0).clamp(-1.0, 1.0)
        pcm = (waveform * 32767).to(torch.int16)
        return pcm.numpy().tobytes()
