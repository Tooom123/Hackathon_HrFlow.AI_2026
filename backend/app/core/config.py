from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Hackathon HrFlow.AI 2026 API"
    app_version: str = "0.1.0"

    api_key: str
    user_email: str
    hrflow_board_key: str = ""
    hrflow_source_key: str = ""

    # --- Frontend ---
    frontend_base_url: str = "http://localhost:5173"

    # --- Ollama (local LLM) ---
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ollama_temperature: float = 0.3

    # --- STT (mlx-whisper) ---
    whisper_model: str = "mlx-community/whisper-large-v3-turbo"
    whisper_language: str = "fr"

    # --- VAD (Silero) ---
    vad_threshold: float = 0.5
    vad_min_silence_ms: int = 700
    vad_min_speech_ms: int = 250
    vad_input_sample_rate: int = 24_000  # matches frontend capture rate

    # --- TTS (Edge-TTS) ---
    tts_voice: str = "fr-FR-HenriNeural"
    tts_sample_rate: int = 24_000
    tts_chunk_size: int = 4096


settings = Settings()
