"""Provider Factory for JARVIS AI System."""

from src.config import Settings
from src.providers.base import BaseLLMProvider
from src.providers.gemini import GeminiProvider
from src.providers.openai_compatible import OpenAICompatibleProvider
from src.providers.mock import DiagnosticMockProvider


def get_llm_provider(config: Settings) -> BaseLLMProvider:
    """Instantiate and return the appropriate LLM provider."""
    provider_type = config.AI_PROVIDER.lower().strip()

    if provider_type == "gemini":
        if config.GEMINI_API_KEY and len(config.GEMINI_API_KEY.strip()) > 5:
            return GeminiProvider(
                api_key=config.GEMINI_API_KEY,
                model_name=config.AI_MODEL or "gemini-1.5-flash",
            )
    elif provider_type == "openai":
        if config.OPENAI_API_KEY and len(config.OPENAI_API_KEY.strip()) > 5:
            return OpenAICompatibleProvider(
                api_key=config.OPENAI_API_KEY,
                model_name=config.AI_MODEL or "gpt-4o-mini",
                base_url="https://api.openai.com/v1",
                provider_name="openai",
            )
    elif provider_type == "groq":
        if config.GROQ_API_KEY and len(config.GROQ_API_KEY.strip()) > 5:
            return OpenAICompatibleProvider(
                api_key=config.GROQ_API_KEY,
                model_name=config.AI_MODEL or "llama-3.3-70b-versatile",
                base_url="https://api.groq.com/openai/v1",
                provider_name="groq",
            )

    # Fallback to diagnostic provider if keys are missing
    return DiagnosticMockProvider()
