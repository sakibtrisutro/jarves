"""Diagnostic Mock Cloud Provider.

Used when no external cloud AI API key has been configured yet.
Ensures the application boots cleanly, remains 100% interactive, and guides the user.
"""

from typing import List, Optional
from src.providers.base import BaseLLMProvider, LLMMessage, ProviderResponse


class DiagnosticMockProvider(BaseLLMProvider):
    """Provides structured operational guidance when external keys are pending."""

    def __init__(self, message: Optional[str] = None):
        self.custom_message = message

    async def generate(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
    ) -> ProviderResponse:
        """Return diagnostic instructions for connecting live Cloud AI."""
        last_user_msg = messages[-1].content if messages else "Hello"

        # Format structured guidance
        guidance = (
            "🤖 **JARVIS Operational Diagnostic Mode**\n\n"
            "I am currently running in **Local Diagnostic Mode** on your Windows laptop. "
            "All deterministic skills (**Personal Memory**, **Task Manager**, **Notes & Knowledge**, and **System Status**) are fully active and persistent!\n\n"
            "**To activate Cloud AI reasoning:**\n"
            "1. Open `.env` in the repository root (`C:\\Users\\SAKIB\\Desktop\\jarves\\.env`).\n"
            "2. Add your API key (e.g., `GEMINI_API_KEY=AIzaSy...` or `OPENAI_API_KEY=sk-...`).\n"
            "3. Restart the server or click **System Status** to refresh.\n\n"
            f"*You said:* \"{last_user_msg}\""
        )

        return ProviderResponse(
            content=guidance,
            model="local-diagnostic-engine",
            provider="mock",
            tokens_prompt=0,
            tokens_completion=0,
            is_fallback=True,
        )
