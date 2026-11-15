from fastapi import APIRouter
from app.api.routes import answers, health, history, knowledge, meetings, questions, saved_answers, search

api_router = APIRouter()

# Include versioned API route modules
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(meetings.router)
api_router.include_router(questions.router)
api_router.include_router(knowledge.router)
api_router.include_router(search.router)
api_router.include_router(answers.router)
api_router.include_router(history.router)
api_router.include_router(saved_answers.router)
