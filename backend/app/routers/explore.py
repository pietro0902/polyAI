import json
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Query

from app.services.polymarket import fetch_explore_markets, fetch_market_by_id, upsert_markets
from app.utils.logger import log

router = APIRouter(tags=["explore"])


@router.get("/explore")
async def list_explore_markets(category: str | None = None):
    """Fetch live markets from Polymarket grouped by category."""
    try:
        raw = await fetch_explore_markets(limit=200)
    except Exception as e:
        log.error("explore_fetch_error", error=str(e))
        raise HTTPException(status_code=502, detail="Failed to fetch markets from Polymarket")

    grouped: dict[str, list[dict]] = defaultdict(list)

    for m in raw:
        cat = m.get("category") or m.get("groupSlug") or "Other"

        if category and cat.lower() != category.lower():
            continue

        outcomes = m.get("outcomes")
        if isinstance(outcomes, str):
            outcomes = json.loads(outcomes)

        outcome_prices = m.get("outcomePrices")
        if isinstance(outcome_prices, str):
            outcome_prices = json.loads(outcome_prices)
        outcome_prices = [float(p) for p in (outcome_prices or [])]

        grouped[cat].append({
            "id": m.get("id") or m.get("conditionId"),
            "question": m.get("question", ""),
            "description": m.get("description", ""),
            "category": cat,
            "outcomes": outcomes or ["Yes", "No"],
            "outcome_prices": outcome_prices,
            "volume": float(m.get("volume", 0) or 0),
            "liquidity": float(m.get("liquidity", 0) or 0),
            "end_date": m.get("endDate") or m.get("endDateIso"),
            "slug": m.get("slug", ""),
        })

    return grouped


@router.post("/explore/track/{polymarket_id}")
async def track_market(polymarket_id: str):
    """Track a market: fetch from Gamma, upsert into DB, trigger predictions."""
    market = await fetch_market_by_id(polymarket_id)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found on Polymarket")

    count = await upsert_markets([market])

    # Trigger predictions for the newly tracked market
    from app.database import supabase

    result = (
        supabase.table("markets")
        .select("id")
        .eq("polymarket_id", polymarket_id)
        .single()
        .execute()
    )
    if result.data:
        try:
            from app.workers.prediction_runner import run_predictions_for_market

            market_row = (
                supabase.table("markets")
                .select("*")
                .eq("polymarket_id", polymarket_id)
                .single()
                .execute()
            )
            if market_row.data:
                import asyncio
                asyncio.create_task(run_predictions_for_market(market_row.data))
        except Exception as e:
            log.warning("track_predictions_error", polymarket_id=polymarket_id, error=str(e))

    return {"status": "ok", "tracked": count > 0, "polymarket_id": polymarket_id}
