import logging
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["learning"])
logger = logging.getLogger(__name__)


class LearningSessionCreate(BaseModel):
    student_id: str
    story_id: str


@router.post("/learning-sessions", status_code=201)
def create_learning_session(payload: LearningSessionCreate):
    """Stub: create a new learning session. Full implementation pending DB."""
    logger.info("New learning session: student=%s story=%s", payload.student_id, payload.story_id)
    return {"status": "created", "student_id": payload.student_id, "story_id": payload.story_id}
