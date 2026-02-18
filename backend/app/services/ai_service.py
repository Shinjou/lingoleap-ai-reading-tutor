"""
AI API calls — all AI model interactions are centralised here.

Rules (from CLAUDE.md):
  - ALL AI API calls must live in this file only.
  - The frontend never calls AI APIs directly.
  - Currently used for: Socratic comprehension Q&A (Step 3), exit-ticket
    generation and grading (Step 6).
  - STT/TTS use browser-native APIs and are NOT routed through here.

Future: configure the OpenAI client from app.config.settings.openai_api_key.
"""

from ..config import settings  # noqa: F401 — will be used when wired up


async def generate_socratic_question(text: str, student_answer: str) -> str:
    """
    Generate a Socratic follow-up question based on the story text and the
    student's answer. Returns a warm, encouraging question in Traditional Chinese.

    Stub: returns a placeholder until OpenAI integration is implemented.
    """
    # TODO: call OpenAI Chat Completions API with a carefully crafted system prompt
    return "你剛才讀了什麼？可以用自己的話說說看嗎？"


async def generate_exit_ticket(text: str) -> list[dict]:
    """
    Generate exit-ticket questions for a story text.
    Returns a list of question dicts: [{"question": str, "type": str}, ...]

    Stub: returns placeholder questions until OpenAI integration is implemented.
    """
    # TODO: implement with OpenAI
    return [
        {"question": "這篇文章的主角是誰？", "type": "short_answer"},
        {"question": "作者想要告訴我們什麼道理？", "type": "short_answer"},
    ]


async def grade_exit_ticket(question: str, student_answer: str, reference_text: str) -> dict:
    """
    Grade a student's exit-ticket answer.
    Returns {"score": int, "feedback": str} with score 0–100.

    Stub: returns placeholder until OpenAI integration is implemented.
    """
    # TODO: implement with OpenAI
    return {"score": 0, "feedback": "批改功能尚未實作"}
