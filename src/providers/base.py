"""Base Provider Protocol and Data Models."""

from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    """Standardized representation of a single conversation turn."""
    role: str = Field(description="Role of message author: 'user', 'assistant', or 'system'")
    content: str = Field(description="Textual content of the message")


class ProviderResponse(BaseModel):
    """Normalized response schema returned by all AI providers."""
    content: str
    model: str
    provider: str
    tokens_prompt: int = 0
    tokens_completion: int = 0
    error: Optional[str] = None
    is_fallback: bool = False


class BaseLLMProvider(ABC):
    """Abstract interface defining required provider capabilities."""

    @abstractmethod
    async def generate(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
    ) -> ProviderResponse:
        """Generate a response from the cloud AI model."""
        pass
