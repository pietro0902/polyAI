import httpx
from app.config import settings
from app.database import supabase
from app.utils.logger import log

GAMMA_BASE = settings.polymarket_gamma_url
CLOB_BASE = settings.polymarket_clob_url


async def fetch_active_markets(limit: int = 50) -> list[dict]:
    """Fetch active markets from Polymarket Gamma API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GAMMA_BASE}/markets",
            params={
                "closed": "false",
                "limit": limit,
                "order": "volume",
                "ascending": "false",
                "active": "true",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_explore_markets(limit: int = 200) -> list[dict]:
    """Fetch a large batch of active markets for the explore page."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GAMMA_BASE}/markets",
            params={
                "closed": "false",
                "limit": limit,
                "order": "volume",
                "ascending": "false",
                "active": "true",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_market_by_id(polymarket_id: str) -> dict | None:
    """Fetch a single market from Gamma API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GAMMA_BASE}/markets/{polymarket_id}")
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()


async def fetch_market_prices(polymarket_id: str) -> list[float] | None:
    """Fetch current prices for a market from Gamma API."""
    market = await fetch_market_by_id(polymarket_id)
    if not market:
        return None

    prices = market.get("outcomePrices")
    if prices:
        if isinstance(prices, str):
            import json
            prices = json.loads(prices)
        return [float(p) for p in prices]
    return None


async def check_market_resolution(polymarket_id: str) -> str | None:
    """Check if a market has been resolved on Polymarket. Returns outcome or None."""
    market = await fetch_market_by_id(polymarket_id)
    if not market:
        return None

    if market.get("closed") and market.get("resolved"):
        # Determine winning outcome
        prices = market.get("outcomePrices")
        if prices:
            if isinstance(prices, str):
                import json
                prices = json.loads(prices)
            prices = [float(p) for p in prices]
            # The outcome with price ~1.0 won
            if len(prices) >= 2:
                if prices[0] > 0.9:
                    return "Yes"
                elif prices[1] > 0.9:
                    return "No"

        # Fallback: check resolution field
        if market.get("outcome"):
            return market["outcome"]

    return None


async def upsert_markets(raw_markets: list[dict]) -> int:
    """Upsert markets from Gamma API into the database. Returns count of new markets."""
    import json

    new_count = 0
    for m in raw_markets:
        polymarket_id = m.get("id") or m.get("conditionId")
        if not polymarket_id:
            continue

        question = m.get("question", "")
        if not question:
            continue

        # Parse outcomes and prices
        outcomes = m.get("outcomes")
        if isinstance(outcomes, str):
            outcomes = json.loads(outcomes)
        outcomes = outcomes or ["Yes", "No"]

        outcome_prices = m.get("outcomePrices")
        if isinstance(outcome_prices, str):
            outcome_prices = json.loads(outcome_prices)
        outcome_prices = outcome_prices or []
        outcome_prices = [float(p) for p in outcome_prices]

        clob_token_ids = m.get("clobTokenIds")
        if isinstance(clob_token_ids, str):
            clob_token_ids = json.loads(clob_token_ids)
        clob_token_ids = clob_token_ids or []

        end_date = m.get("endDate") or m.get("endDateIso")

        row = {
            "polymarket_id": str(polymarket_id),
            "question": question,
            "description": m.get("description", ""),
            "category": m.get("category") or m.get("groupSlug", ""),
            "slug": m.get("slug", ""),
            "event_slug": (m.get("events") or [{}])[0].get("slug", "") if m.get("events") else "",
            "outcomes": outcomes,
            "outcome_prices": outcome_prices,
            "end_date": end_date,
            "volume": float(m.get("volume", 0) or 0),
            "liquidity": float(m.get("liquidity", 0) or 0),
            "status": "active",
            "clob_token_ids": clob_token_ids,
            "raw_data": m,
        }

        try:
            result = (
                supabase.table("markets")
                .upsert(row, on_conflict="polymarket_id")
                .execute()
            )
            if result.data:
                new_count += 1
        except Exception as e:
            log.error("market_upsert_error", polymarket_id=polymarket_id, error=str(e))

    return new_count
