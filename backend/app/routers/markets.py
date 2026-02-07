from fastapi import APIRouter, Query, HTTPException
from app.database import supabase
from app.models.schemas import MarketResponse, MarketDetail
from app.utils.logger import log

router = APIRouter(tags=["markets"])


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
    return result.data


@router.get("/markets/{market_id}", response_model=MarketDetail)
async def get_market(market_id: str):
    market = supabase.table("markets").select("*").eq("id", market_id).single().execute()
    if not market.data:
        raise HTTPException(status_code=404, detail="Market not found")

    preds = supabase.table("predictions").select("*").eq("market_id", market_id).execute()
    cons_result = supabase.table("consensus").select("*").eq("market_id", market_id).execute()

    data = market.data
    data["predictions"] = preds.data or []
    data["consensus"] = cons_result.data[0] if cons_result.data else None
    return data


@router.post("/markets/refresh")
async def refresh_markets():
    from app.workers.market_poller import poll_markets
    count = await poll_markets()
    return {"status": "ok", "new_markets": count}
