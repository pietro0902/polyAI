import time

from openai import AsyncOpenAI

from app.config import settings
from app.utils.logger import log

_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key,
)

_RESEARCH_PROMPT = (
    "Research the latest news and developments about the following question. "
    "Focus on facts, recent events, expert opinions, polling data, and any "
    "information relevant to predicting the outcome.\n\n"
    "Question: {question}\n\n"
    "Context: {description}\n\n"
    "Provide a concise factual summary of the most relevant findings. "
    "Include dates and sources where possible."
)


async def research_market(question: str, description: str) -> str:
    """Call Perplexity sonar-pro via OpenRouter to gather current web context.

    Returns the research summary, or empty string on failure.
    """
    if not settings.web_research_enabled:
        log.info("web_research_skipped", reason="disabled")
        return ""

    start = time.monotonic()
    try:
        resp = await _client.chat.completions.create(
            model=settings.web_research_model,
            messages=[
                {
                    "role": "user",
                    "content": _RESEARCH_PROMPT.format(
                        question=question,
                        description=description or "No additional context.",
                    ),
                }
            ],
            temperature=0.2,
            max_tokens=2000,
        )
        summary = resp.choices[0].message.content or ""
        elapsed_ms = int((time.monotonic() - start) * 1000)

        log.info(
            "web_research_complete",
            question=question[:80],
            length=len(summary),
            elapsed_ms=elapsed_ms,
        )
        return summary.strip()

    except Exception as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        log.error(
            "web_research_failed",
            question=question[:80],
            error=str(e),
            elapsed_ms=elapsed_ms,
        )
        return ""
