"""JARVIS AI System - Configuration Module.

Reads configuration from environment variables and .env file.
Validates settings, directories, and provides masked secret views.
"""

from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable overrides."""

    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = False

    # Cloud AI Provider: "gemini" | "openai" | "groq" | "mock"
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-1.5-flash"

    # API Keys
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GITHUB_TOKEN: Optional[str] = None

    # Storage paths
    DATA_DIR: str = "data"
    DB_PATH: str = "data/jarvis.db"

    # Spending safety
    DAILY_BUDGET_LIMIT: float = 2.00

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_cloud_ai_configured(self) -> bool:
        """Check whether any valid cloud AI API key is configured."""
        provider = self.AI_PROVIDER.lower().strip()
        if provider == "gemini" and self.GEMINI_API_KEY and len(self.GEMINI_API_KEY.strip()) > 5:
            return True
        if provider == "openai" and self.OPENAI_API_KEY and len(self.OPENAI_API_KEY.strip()) > 5:
            return True
        if provider == "groq" and self.GROQ_API_KEY and len(self.GROQ_API_KEY.strip()) > 5:
            return True
        return False

    @property
    def active_key_masked(self) -> str:
        """Return a masked representation of the active provider key."""
        key = None
        provider = self.AI_PROVIDER.lower().strip()
        if provider == "gemini":
            key = self.GEMINI_API_KEY
        elif provider == "openai":
            key = self.OPENAI_API_KEY
        elif provider == "groq":
            key = self.GROQ_API_KEY

        if not key or len(key.strip()) < 8:
            return "Not Configured"
        clean = key.strip()
        return f"{clean[:4]}...{clean[-4:]}"

    def ensure_directories(self) -> None:
        """Create required runtime directories."""
        data_path = Path(self.DATA_DIR)
        data_path.mkdir(parents=True, exist_ok=True)
        (data_path / "backups").mkdir(parents=True, exist_ok=True)
        (data_path / "logs").mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()
