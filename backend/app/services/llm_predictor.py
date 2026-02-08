import asyncio
import json
import re
import time
from datetime import datetime, timezone
from typing import Any

from openai import AsyncOpenAI

from app.config import settings
from app.database import supabase
from app.services.prompt_builder import build_prediction_prompt, SYSTEM_PROMPT
from app.services.web_researcher import research_market
from app.utils.logger import log
from app.utils.retry import llm_retry

# Single OpenRouter client for all models
_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key,
)


def _get_enabled_models() -> dict[str, str]:
    """Fetch enabled models from the llm_models table."""
    result = supabase.table("llm_models").select("name, openrouter_id").eq("enabled", True).execute()
    return {row["name"]: row["openrouter_id"] for row in (result.data or [])}


def _parse_llm_response(raw_text: str) -> dict:
    """Parse LLM response text into structured prediction."""
    text = raw_text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Fix newlines inside JSON string values (common with Gemini)
        text = re.sub(r'(?<=": ")(.*?)(?="[,\s}])', lambda m: m.group(0).replace("\n", " "), text, flags=re.DOTALL)
        parsed = json.loads(text)

    prediction = parsed.get("prediction", "NO_TRADE").upper()
    if prediction not in ("YES", "NO", "NO_TRADE"):
        prediction = "NO_TRADE"

    confidence = float(parsed.get("confidence", 0.5))
    confidence = max(0.0, min(1.0, confidence))

    return {
        "prediction": prediction,
        "confidence": confidence,
        "reasoning": parsed.get("reasoning", ""),
    }


@llm_retry
async def _call_model(model_id: str, prompt: str) -> dict[str, Any]:
    """Call a model via OpenRouter."""
    start = time.monotonic()

    resp = await _client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=1000,
    )

    elapsed_ms = int((time.monotonic() - start) * 1000)
    raw_text = resp.choices[0].message.content or "{}"
    parsed = _parse_llm_response(raw_text)

    return {
        **parsed,
        "raw_response": {"text": raw_text, "model": model_id},
        "response_time_ms": elapsed_ms,
    }


async def _safe_call(name: str, model_id: str, prompt: str, market_id: str) -> dict:
    """Wrap an LLM call with error handling."""
    try:
        result = await _call_model(model_id, prompt)
        return {
            "market_id": market_id,
            "model_name": name,
            **result,
            "error": None,
        }
    except Exception as e:
        log.error("llm_call_failed", model=name, market_id=market_id, error=str(e))
        return {
            "market_id": market_id,
            "model_name": name,
            "prediction": "NO_TRADE",
            "confidence": 0.0,
            "reasoning": "",
            "raw_response": {"error": str(e)},
            "response_time_ms": 0,
            "error": str(e),
        }


async def get_all_predictions(market: dict) -> list[dict]:
    """Run all enabled LLMs in parallel via OpenRouter and return predictions."""
    models = _get_enabled_models()
    if not models:
        log.warning("no_enabled_models", market_id=market["id"])
        return []

    market_id = market["id"]

    # Web research step
    research_context = await research_market(
        question=market.get("question", ""),
        description=market.get("description", ""),
    )

    # Save web research to the market record
    if research_context:
        supabase.table("markets").update({
            "web_research": research_context,
            "web_research_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", market_id).execute()

    prompt = build_prediction_prompt(market, research_context=research_context)

    tasks = [
        _safe_call(name, model_id, prompt, market_id)
        for name, model_id in models.items()
    ]
    results = await asyncio.gather(*tasks)

    log.info(
        "predictions_complete",
        market_id=market_id,
        has_research=bool(research_context),
        results=[{r["model_name"]: r["prediction"]} for r in results],
    )

    return list(results)
