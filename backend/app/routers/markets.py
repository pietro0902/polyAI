from fastapi import APIRouter, Query, HTTPException
from app.database import supabase
from app.models.schemas import MarketResponse, MarketDetail
from app.utils.logger import log

router = APIRouter(tags=["markets"])


def _add_polymarket_url(data: dict) -> dict:
    """Extract event slug from raw_data and build the Polymarket URL."""
    raw = data.get("raw_data") or {}
    events = raw.get("events") or []
    event_slug = events[0].get("slug") if events else None
    slug = event_slug or data.get("slug")
    data["polymarket_url"] = f"https://polymarket.com/event/{slug}" if slug else None
    return data


@router.get("/markets", response_model=list[MarketResponse])
async def list_markets(
    status: str | None = None,
    category: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = supabase.table("markets").select("*")
    if status:
        query = query.eq("status", status)
    if category:
        query = query.eq("category", category)

    offset = (page - 1) * limit
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()
    return [_add_polymarket_url(m) for m in result.data]


@router.get("/markets/{market_id}", response_model=MarketDetail)
async def get_market(market_id: str):
    market = supabase.table("markets").select("*").eq("id", market_id).single().execute()
    if not market.data:
        raise HTTPException(status_code=404, detail="Market not found")

    preds = supabase.table("predictions").select("*").eq("market_id", market_id).execute()
    cons_result = supabase.table("consensus").select("*").eq("market_id", market_id).execute()

    data = _add_polymarket_url(market.data)
    data["predictions"] = preds.data or []
    data["consensus"] = cons_result.data[0] if cons_result.data else None
    return data


@router.post("/markets/refresh")
async def refresh_markets():
    from app.workers.market_poller import poll_markets
    count = await poll_markets()
    return {"status": "ok", "new_markets": count}
