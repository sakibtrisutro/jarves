"""OpenAI-Compatible Cloud AI Provider Adapter.

Supports OpenAI, Groq, and OpenRouter using standardized chat completion schemas.
"""

from typing import List, Optional
import httpx
from src.providers.base import BaseLLMProvider, LLMMessage, ProviderResponse


class OpenAICompatibleProvider(BaseLLMProvider):
    """Provider for OpenAI, Groq, and standard OpenAI-compatible endpoints."""

    def __init__(
        self,
        api_key: str,
        model_name: str = "gpt-4o-mini",
        base_url: str = "https://api.openai.com/v1",
        provider_name: str = "openai",
    ):
        self.api_key = api_key.strip()
        self.model_name = model_name.strip()
        self.base_url = base_url.rstrip("/")
        self.provider_name = provider_name

    async def generate(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
    ) -> ProviderResponse:
        """Call Chat Completions endpoint."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})

        for msg in messages:
            formatted_messages.append({"role": msg.role, "content": msg.content})

        payload = {
            "model": self.model_name,
            "messages": formatted_messages,
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, headers=headers, json=payload)

            if response.status_code != 200:
                err_data = response.json() if "application/json" in response.headers.get("content-type", "") else response.text
                return ProviderResponse(
                    content=f"{self.provider_name.title()} API Error ({response.status_code}): {err_data}",
                    model=self.model_name,
                    provider=self.provider_name,
                    error=str(err_data),
                )

            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                return ProviderResponse(
                    content=f"{self.provider_name.title()} returned an empty choice list.",
                    model=self.model_name,
                    provider=self.provider_name,
                    error="No choices returned",
                )

            reply = choices[0].get("message", {}).get("content", "")
            usage = data.get("usage", {})
            return ProviderResponse(
                content=reply,
                model=self.model_name,
                provider=self.provider_name,
                tokens_prompt=usage.get("prompt_tokens", 0),
                tokens_completion=usage.get("completion_tokens", 0),
            )

        except Exception as exc:
            return ProviderResponse(
                content=f"Failed to communicate with {self.provider_name.title()}: {exc}",
                model=self.model_name,
                provider=self.provider_name,
                error=str(exc),
            )
