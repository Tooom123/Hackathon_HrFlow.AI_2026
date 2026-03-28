"""Voice Activity Detection service using Silero VAD.

Receives raw audio chunks (PCM 16-bit, 16 kHz mono), detects speech
boundaries, and emits complete speech segments when silence is detected.
"""

from __future__ import annotations

import asyncio
import struct
from dataclasses import dataclass, field

import torch


@dataclass
class VADConfig:
    sample_rate: int = 16_000
    input_sample_rate: int = 24_000  # sample rate of incoming audio from client
    threshold: float = 0.5
    min_silence_duration_ms: int = 700
    min_speech_duration_ms: int = 250
    window_size_samples: int = 512  # Silero expects 512 samples at 16kHz


class VADService:
    """Wraps Silero VAD for streaming speech detection."""

    def __init__(self, config: VADConfig | None = None) -> None:
        self._config = config or VADConfig()
        self._model: torch.jit.ScriptModule | None = None
        self._speech_buffer: bytearray = bytearray()
        self._resample_buffer: bytearray = bytearray()
        self._is_speaking: bool = False
        self._silence_samples: int = 0
        self._speech_samples: int = 0

    async def load_model(self) -> None:
        """Load the Silero VAD model. Call once at startup."""
        loop = asyncio.get_event_loop()
        self._model = await loop.run_in_executor(None, self._load_silero)

    @staticmethod
    def _load_silero() -> torch.jit.ScriptModule:
        model, _ = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            trust_repo=True,
        )
        return model

    def _resample_chunk(self, chunk: bytes) -> bytes:
        """Resample incoming audio from input_sample_rate to VAD sample_rate (16 kHz)."""
        src_rate = self._config.input_sample_rate
        dst_rate = self._config.sample_rate
        if src_rate == dst_rate:
            return chunk

        self._resample_buffer.extend(chunk)

        # Number of input samples available
        n_src = len(self._resample_buffer) // 2
        if n_src == 0:
            return b""

        src_samples = struct.unpack(f"<{n_src}h", bytes(self._resample_buffer[:n_src * 2]))

        # How many output samples we can produce
        n_dst = int(n_src * dst_rate / src_rate)
        if n_dst == 0:
            return b""

        # Consume the input samples we'll use
        # Exact number of input samples consumed for n_dst output samples
        n_consumed = int(n_dst * src_rate / dst_rate)
        self._resample_buffer = self._resample_buffer[n_consumed * 2:]

        # Linear interpolation
        out = []
        for i in range(n_dst):
            src_pos = i * src_rate / dst_rate
            idx = int(src_pos)
            frac = src_pos - idx
            if idx + 1 < n_consumed:
                val = src_samples[idx] * (1 - frac) + src_samples[idx + 1] * frac
            else:
                val = src_samples[min(idx, n_consumed - 1)]
            out.append(int(max(-32768, min(32767, val))))

        return struct.pack(f"<{n_dst}h", *out)

    async def feed_chunk(self, chunk: bytes) -> tuple[bytes, float] | None:
        """Feed a raw PCM 16-bit audio chunk (at input_sample_rate).

        Returns:
            (audio_bytes, duration_s) when end-of-speech detected, else None.
        """
        if self._model is None:
            raise RuntimeError("VAD model not loaded — call load_model() first")

        resampled = self._resample_chunk(chunk)
        if not resampled:
            return None

        self._speech_buffer.extend(resampled)

        window = self._config.window_size_samples
        bytes_per_window = window * 2  # 16-bit = 2 bytes per sample

        while len(self._speech_buffer) >= bytes_per_window:
            window_bytes = bytes(self._speech_buffer[:bytes_per_window])
            self._speech_buffer = self._speech_buffer[bytes_per_window:]

            samples = struct.unpack(f"<{window}h", window_bytes)
            tensor = torch.FloatTensor(samples) / 32768.0

            prob = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda t=tensor: self._model(t, self._config.sample_rate).item(),
            )

            if prob >= self._config.threshold:
                self._speech_samples += window
                self._silence_samples = 0
                if not self._is_speaking:
                    self._is_speaking = True
                    self._collected_audio = bytearray(window_bytes)
                else:
                    self._collected_audio.extend(window_bytes)
            elif self._is_speaking:
                self._silence_samples += window
                self._collected_audio.extend(window_bytes)

                silence_ms = (self._silence_samples / self._config.sample_rate) * 1000
                speech_ms = (self._speech_samples / self._config.sample_rate) * 1000

                if silence_ms >= self._config.min_silence_duration_ms:
                    if speech_ms >= self._config.min_speech_duration_ms:
                        audio = bytes(self._collected_audio)
                        duration_s = len(audio) / (2 * self._config.sample_rate)
                        self._reset_state()
                        return (audio, duration_s)
                    self._reset_state()

        return None

    def _reset_state(self) -> None:
        self._is_speaking = False
        self._silence_samples = 0
        self._speech_samples = 0
        self._collected_audio = bytearray()

    def reset(self) -> None:
        """Reset internal VAD state between questions."""
        self._speech_buffer.clear()
        self._resample_buffer.clear()
        self._reset_state()
        if self._model is not None:
            self._model.reset_states()
