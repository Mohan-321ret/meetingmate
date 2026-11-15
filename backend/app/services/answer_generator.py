import json
import logging
import re
from typing import Any, List, Optional
from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException
from app.database import crud
from app.schemas.answer import (
    AnswerCreate,
    AnswerGenerateRequest,
    AnswerGenerateResponse,
    AnswerSourceItem,
)
from app.schemas.search import SearchHistoryCreate
from app.services.llm import GroqService, get_groq_service
from app.services.prompts import SYSTEM_PROMPT_TAMIL, build_user_prompt
from app.services.retrieval import RetrievalService, get_retrieval_service

logger = logging.getLogger("meetingmate.answer_generator")


class AnswerGeneratorService:
    """
    Orchestrates the complete RAG answer generation pipeline:
    1. Receives meeting question.
    2. Retrieves verified knowledge chunks from the vector database.
    3. Builds structured conversational prompt with citation boundaries.
    4. Invokes Groq LLM (with async support, rate-limiting & fallback resilience).
    5. Validates, formats and cleans Tamil response.
    6. Optionally persists crafted answer into SQLite.
    """

    def __init__(
        self,
        retrieval_service: Optional[RetrievalService] = None,
        groq_service: Optional[GroqService] = None,
    ):
        self.retrieval_service = retrieval_service or get_retrieval_service()
        self.groq_service = groq_service or get_groq_service()

    async def generate_answer_async(
        self,
        payload: AnswerGenerateRequest,
        db: Optional[Session] = None,
    ) -> AnswerGenerateResponse:
        """
        Executes asynchronous RAG answer generation.
        """
        return await self._process_generation(payload, db=db, is_async=True)

    def generate_answer(
        self,
        payload: AnswerGenerateRequest,
        db: Optional[Session] = None,
    ) -> AnswerGenerateResponse:
        """
        Executes synchronous RAG answer generation.
        """
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # In active loop context, execute synchronous generator
                return self._process_generation_sync(payload, db=db)
            else:
                return loop.run_until_complete(self._process_generation(payload, db=db, is_async=True))
        except RuntimeError:
            return self._process_generation_sync(payload, db=db)

    async def _process_generation(
        self,
        payload: AnswerGenerateRequest,
        db: Optional[Session] = None,
        is_async: bool = True,
    ) -> AnswerGenerateResponse:
        question = payload.question.strip()
        answer_type = payload.answer_type.lower()

        logger.info(f"Generating '{answer_type}' answer for question: '{question[:50]}...'")

        # 1. Retrieve top reference chunks (top_k=3 to keep tokens lightweight)
        raw_sources = self.retrieval_service.search(
            query=question,
            top_k=3,
            min_score=0.40,
            db=db,
        )

        # 2. Check if reference material is sufficient
        if not self._is_context_sufficient(raw_sources, question):
            logger.info("Retrieved references are insufficient or off-topic. Returning notice.")
            return AnswerGenerateResponse(
                answer=(
                    "இந்தக் கேள்விக்குத் தேவையான போதுமான ஆதாரக் குறிப்புகள் கிடைக்கவில்லை. "
                    "தயவுசெய்து jw.org-ல் உள்ள உத்தியோகப்பூர்வ பிரசுரங்களை சரிபார்க்கவும்."
                ),
                sources=[],
                answer_type=answer_type,
                model_used=self.groq_service.model if self.groq_service.is_configured else "local-fallback",
                saved_answer_id=None,
            )

        # Format sources for response
        source_items: List[AnswerSourceItem] = []
        for s in raw_sources:
            snippet = s.content[:200] + ("..." if len(s.content) > 200 else "")
            source_items.append(
                AnswerSourceItem(
                    source_title=s.source_title,
                    source_url=s.source_url,
                    paragraph_reference=s.paragraph_reference,
                    content_snippet=snippet,
                    relevance_score=s.relevance_score,
                    source_type=s.source_type,
                    page_number=s.page_number,
                )
            )

        # 3. Build prompt
        user_prompt = build_user_prompt(
            question=question,
            answer_type=answer_type,
            sources=raw_sources,
            custom_instructions=payload.custom_instructions,
        )

        # 4. Generate answer via Groq or local fallback
        max_tokens = 300 if answer_type == "short" else 600

        if self.groq_service.is_configured:
            if is_async:
                raw_answer = await self.groq_service.generate_chat_completion_async(
                    system_prompt=SYSTEM_PROMPT_TAMIL,
                    user_prompt=user_prompt,
                    max_tokens=max_tokens,
                )
            else:
                raw_answer = self.groq_service.generate_chat_completion(
                    system_prompt=SYSTEM_PROMPT_TAMIL,
                    user_prompt=user_prompt,
                    max_tokens=max_tokens,
                )
            model_used = self.groq_service.model
        else:
            raw_answer = self.groq_service.generate_local_fallback(
                question=question,
                answer_type=answer_type,
                sources=raw_sources,
            )
            model_used = "local-fallback"

        # 5. Clean generated text (strip leading prefixes like "பதில்:", "Answer:", etc.)
        cleaned_answer = self._clean_generated_answer(raw_answer)

        # Prepare serialized sources
        sources_json = (
            json.dumps([s.model_dump() for s in source_items], ensure_ascii=False)
            if source_items
            else None
        )

        # 6. Save answer to SQLite if requested
        saved_id = None
        if payload.save_answer and db:
            saved_id = self._save_answer_to_db(
                db=db,
                question_id=payload.question_id,
                answer_text=cleaned_answer,
                answer_type=answer_type,
                sources_json=sources_json,
            )

        # 7. Record to search history if requested
        if payload.save_to_history and db:
            self._save_to_history(
                db=db,
                query=question,
                answer=cleaned_answer,
                answer_type=answer_type,
                sources_json=sources_json,
            )

        return AnswerGenerateResponse(
            answer=cleaned_answer,
            sources=source_items,
            answer_type=answer_type,
            model_used=model_used,
            saved_answer_id=saved_id,
        )

    def _process_generation_sync(
        self,
        payload: AnswerGenerateRequest,
        db: Optional[Session] = None,
    ) -> AnswerGenerateResponse:
        import asyncio
        return asyncio.run(self._process_generation(payload, db=db, is_async=False))

    def _clean_generated_answer(self, text: str) -> str:
        """
        Cleans extraneous artifacts, conversational headers, or quotation marks.
        """
        cleaned = text.strip()
        # Remove common answer prefixes
        cleaned = re.sub(
            r"^(பதில்|பதில்கள்|Answer|Comment):\s*",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        # Strip wrapping quotation marks if present
        if (cleaned.startswith('"') and cleaned.endswith('"')) or (
            cleaned.startswith("'") and cleaned.endswith("'")
        ):
            cleaned = cleaned[1:-1].strip()
        return cleaned

    def _is_context_sufficient(self, sources: List[Any], question: str) -> bool:
        """
        Determines whether retrieved reference sources provide sufficient topical
        information to answer the question faithfully without hallucination.
        """
        if not sources:
            return False

        top_source = sources[0]
        # Ignore common grammatical particles/conjunctions
        STOP_WORDS = {
            "மற்றும்", "பற்றி", "என்று", "ஆகிய", "ஒரு", "தான்", "அவர்", "நாம்", "நீங்கள்",
            "விளக்குக", "விளக்குங்கள்", "பற்றி", "சொல்கிறது", "சொல்லுங்கள்", "கூறுங்கள்",
            "about", "what", "which", "with", "from", "that", "this", "they", "have", "explain"
        }
        q_words = [
            w for w in re.findall(r"\w+", question.lower())
            if len(w) >= 3 and w not in STOP_WORDS
        ]
        if not q_words:
            return getattr(top_source, "relevance_score", 0.0) >= 0.50

        all_content = " ".join(f"{s.source_title} {s.content}" for s in sources).lower()
        matches = sum(1 for w in q_words if w in all_content)

        # If zero content words appear in any source and top relevance is moderate, it's out-of-scope
        if matches == 0 and getattr(top_source, "relevance_score", 0.0) < 0.75:
            return False
        return True

    def _save_answer_to_db(
        self,
        db: Session,
        question_id: Optional[str],
        answer_text: str,
        answer_type: str,
        sources_json: Optional[str] = None,
    ) -> Optional[str]:
        """
        Saves answer to SQLite database with supporting sources.
        """
        try:
            # If question_id provided, verify existence
            if question_id:
                q = crud.get_question(db, question_id)
                if not q:
                    logger.warning(f"Parent question {question_id} not found in DB. Saving independent answer.")
                    question_id = None

            ans_in = AnswerCreate(
                question_id=question_id,
                answer_text=answer_text,
                answer_type=answer_type,
                sources_json=sources_json,
            )
            created = crud.create_answer(db, ans_in)
            logger.info(f"Persisted generated answer to SQLite (ID: {created.id})")
            return created.id
        except Exception as e:
            logger.error(f"Failed to save generated answer to SQLite: {e}")
            return None

    def _save_to_history(
        self,
        db: Session,
        query: str,
        answer: str,
        answer_type: str,
        sources_json: Optional[str] = None,
    ) -> None:
        """
        Records the question, generated answer, and sources into SearchHistory.
        """
        try:
            history_in = SearchHistoryCreate(
                query=query,
                answer=answer,
                answer_type=answer_type,
                sources_json=sources_json,
            )
            crud.create_search_history(db, history_in)
            logger.info("Recorded question and answer into search history.")
        except Exception as e:
            logger.warning(f"Could not record search history: {e}")

    async def generate_for_question_async(
        self,
        db: Session,
        question_id: str,
        answer_type: str = "short",
        language: str = "ta",
        save_answer: bool = True,
    ) -> AnswerGenerateResponse:
        """
        Generates answer for a specific meeting question, maintaining the
        relationship between Meeting, Question, Answer, and Sources.
        """
        q = crud.get_question(db, question_id)
        if not q:
            raise EntityNotFoundException(
                message=f"Question with ID '{question_id}' not found.",
                details={"question_id": question_id},
            )

        payload = AnswerGenerateRequest(
            question=q.question_text,
            answer_type=answer_type,
            language=language,
            question_id=question_id,
            save_answer=save_answer,
            save_to_history=True,
        )
        return await self.generate_answer_async(payload, db=db)


# Singleton answer generator instance
_answer_generator_instance: Optional[AnswerGeneratorService] = None


def get_answer_generator() -> AnswerGeneratorService:
    """
    Returns the singleton AnswerGeneratorService instance.
    """
    global _answer_generator_instance
    if _answer_generator_instance is None:
        _answer_generator_instance = AnswerGeneratorService()
    return _answer_generator_instance
