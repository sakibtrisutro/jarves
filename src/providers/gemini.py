"""Google Gemini Cloud AI Provider.

Connects to the official Google Generative Language REST API via httpx.
Requires zero heavy SDK dependencies and operates purely over async HTTP.
"""

from typing import List, Optional
import httpx
from src.providers.base import BaseLLMProvider, LLMMessage, ProviderResponse


class GeminiProvider(BaseLLMProvider):
    """Provider adapter for Google Gemini API."""

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key.strip()
        self.model_name = model_name.strip()
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
    ) -> ProviderResponse:
        """Call Gemini generateContent endpoint."""
        url = f"{self.base_url}/{self.model_name}:generateContent?key={self.api_key}"

        # Format conversation turns for Gemini
        contents = []
        for msg in messages:
            gemini_role = "user" if msg.role == "user" else "model"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": msg.content}]
            })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
            }
        }

        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, json=payload)

            if response.status_code != 200:
                err_data = response.json() if "application/json" in response.headers.get("content-type", "") else response.text
                return ProviderResponse(
                    content=f"Gemini API Error ({response.status_code}): {err_data}",
                    model=self.model_name,
                    provider="gemini",
                    error=str(err_data),
                )

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return ProviderResponse(
                    content="Gemini returned an empty response.",
                    model=self.model_name,
                    provider="gemini",
                    error="No candidates returned",
                )

            first_candidate = candidates[0]
            parts = first_candidate.get("content", {}).get("parts", [])
            reply_text = parts[0].get("text", "") if parts else ""

            usage = data.get("usageMetadata", {})
            return ProviderResponse(
                content=reply_text,
                model=self.model_name,
                provider="gemini",
                tokens_prompt=usage.get("promptTokenCount", 0),
                tokens_completion=usage.get("candidatesTokenCount", 0),
            )

        except Exception as exc:
            return ProviderResponse(
                content=f"Failed to communicate with Google Gemini: {exc}",
                model=self.model_name,
                provider="gemini",
                error=str(exc),
            )
