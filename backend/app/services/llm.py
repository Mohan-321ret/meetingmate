import logging
from typing import List, Optional
from groq import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AsyncGroq,
    Groq,
    RateLimitError,
)

from app.core.config import settings
from app.core.exceptions import AppException
from app.schemas.search import SearchResultItem

logger = logging.getLogger("meetingmate.llm")

# Placeholder tokens that signify unconfigured key
INVALID_API_KEYS = {"", "your_groq_api_key_here", "dummy", "placeholder", "test_key"}


class GroqService:
    """
    Asynchronous and synchronous Groq LLM integration service.
    Implements timeout control, rate limit resilience, and fallback handling.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        raw_key = api_key if api_key is not None else settings.GROQ_API_KEY
        self.api_key = raw_key.strip() if raw_key else ""
        self.model = model or settings.GROQ_MODEL
        self.timeout = timeout or settings.GROQ_TIMEOUT

        self.is_configured = bool(
            self.api_key and self.api_key.lower() not in INVALID_API_KEYS
        )

        if self.is_configured:
            logger.info(f"Initializing Groq client with model '{self.model}' (timeout={self.timeout}s)")
            self.async_client: Optional[AsyncGroq] = AsyncGroq(
                api_key=self.api_key,
                timeout=self.timeout,
            )
            self.sync_client: Optional[Groq] = Groq(
                api_key=self.api_key,
                timeout=self.timeout,
            )
        else:
            logger.info("GROQ_API_KEY is not configured. Local fallback answer generator enabled.")
            self.async_client = None
            self.sync_client = None

    async def generate_chat_completion_async(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: int = 600,
    ) -> str:
        """
        Sends an asynchronous chat completion request to the Groq API.
        """
        if not self.is_configured or not self.async_client:
            raise AppException(
                message="Groq API key is not configured.",
                status_code=503,
                error_code="GROQ_NOT_CONFIGURED",
            )

        active_model = model or self.model
        temp = temperature if temperature is not None else settings.GROQ_TEMPERATURE

        try:
            logger.info(f"Sending prompt to Groq API ({active_model}, temp={temp})")
            response = await self.async_client.chat.completions.create(
                model=active_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temp,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content or ""
            return content.strip()
        except RateLimitError as e:
            logger.warning(f"Groq API rate limit exceeded: {e}")
            raise AppException(
                message="Groq API rate limit reached. Please wait a moment before trying again.",
                status_code=429,
                error_code="RATE_LIMIT_EXCEEDED",
                details={"model": active_model},
            )
        except APITimeoutError as e:
            logger.error(f"Groq API call timed out after {self.timeout}s: {e}")
            raise AppException(
                message="AI answer generation timed out. Please try again.",
                status_code=504,
                error_code="API_TIMEOUT",
                details={"timeout": self.timeout},
            )
        except APIConnectionError as e:
            logger.error(f"Failed to connect to Groq API: {e}")
            raise AppException(
                message="Unable to reach the AI answer generation service. Check network connectivity.",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE",
            )
        except APIError as e:
            logger.error(f"Groq API returned an error: {e}")
            raise AppException(
                message=f"AI generation failed: {e.message if hasattr(e, 'message') else str(e)}",
                status_code=502,
                error_code="LLM_ERROR",
            )

    def generate_chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: int = 600,
    ) -> str:
        """
        Synchronous wrapper for Groq chat completion.
        """
        if not self.is_configured or not self.sync_client:
            raise AppException(
                message="Groq API key is not configured.",
                status_code=503,
                error_code="GROQ_NOT_CONFIGURED",
            )

        active_model = model or self.model
        temp = temperature if temperature is not None else settings.GROQ_TEMPERATURE

        try:
            response = self.sync_client.chat.completions.create(
                model=active_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temp,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content or ""
            return content.strip()
        except RateLimitError as e:
            logger.warning(f"Groq API rate limit exceeded: {e}")
            raise AppException(
                message="Groq API rate limit reached. Please wait a moment before trying again.",
                status_code=429,
                error_code="RATE_LIMIT_EXCEEDED",
            )
        except APITimeoutError as e:
            logger.error(f"Groq API call timed out: {e}")
            raise AppException(
                message="AI answer generation timed out.",
                status_code=504,
                error_code="API_TIMEOUT",
            )
        except APIConnectionError as e:
            logger.error(f"Failed to connect to Groq API: {e}")
            raise AppException(
                message="Unable to reach AI answer service.",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE",
            )
        except APIError as e:
            logger.error(f"Groq API error: {e}")
            raise AppException(
                message=f"AI generation failed: {str(e)}",
                status_code=502,
                error_code="LLM_ERROR",
            )

    def generate_local_fallback(
        self,
        question: str,
        answer_type: str,
        sources: List[SearchResultItem],
    ) -> str:
        """
        Synthesizes a faithful conversational spoken Tamil answer directly from
        the retrieved reference chunks when running in offline or test mode.
        """
        if not sources:
            return (
                "இந்தக் கேள்விக்குத் தேவையான போதுமான ஆதாரக் குறிப்புகள் கிடைக்கவில்லை. "
                "தயவுசெய்து jw.org-ல் உள்ள உத்தியோகப்பூர்வ பிரசுரங்களை சரிபார்க்கவும்."
            )

        # Aggregate points from top reference
        top_source = sources[0]
        content = top_source.content.strip()

        # Clean title reference
        title = top_source.source_title

        # Build natural conversational Tamil sentences
        sentences = [s.strip() for s in content.replace("\n", " ").split(". ") if s.strip()]

        if answer_type == "short":
            # Concise: 2-3 sentences (~20-40s spoken)
            first_point = sentences[0] if sentences else content
            if not first_point.endswith("."):
                first_point += "."

            second_point = (
                sentences[1] + "."
                if len(sentences) > 1
                else "இது நாம் யெகோவாவை முழுமையாகச் சார்ந்திருக்க உதவுகிறது."
            )
            return f"{first_point} {second_point}"
        else:
            # Detailed: 4-5 sentences (~45-90s spoken)
            selected = sentences[:4] if len(sentences) >= 4 else sentences
            detailed_body = ". ".join(selected)
            if not detailed_body.endswith("."):
                detailed_body += "."

            lesson = "இதன்மூலம், கூட்டங்களில் நாம் கற்றுக்கொள்ளும் ஆவிக்குரிய பாடங்களை நம் அன்றாட வாழ்க்கையில் கடைப்பிடிக்க வேண்டும் என்பதைப் புரிந்துகொள்கிறோம்."
            return f"{detailed_body} {lesson}"


# Singleton GroqService instance
_groq_service_instance: Optional[GroqService] = None


def get_groq_service() -> GroqService:
    """
    Returns the singleton GroqService instance.
    """
    global _groq_service_instance
    if _groq_service_instance is None:
        _groq_service_instance = GroqService()
    return _groq_service_instance
