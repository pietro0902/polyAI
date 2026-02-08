from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    LeaderboardEntry,
    TrackedTraderResponse,
    TraderDetailResponse,
    TraderTradeResponse,
    TraderActivityResponse,
    TraderPositionResponse,
    TraderStatsResponse,
)
from app.services.trader_tracker import (
    fetch_leaderboard,
    fetch_trader_activity,
    fetch_trader_positions,
    track_trader,
    untrack_trader,
    get_tracked_traders,
    get_trader_detail,
    get_trader_trades,
    refresh_trader_trades,
    refresh_trader_profile,
    refresh_all_tracked_traders,
    get_stats_summary,
)

router = APIRouter(tags=["traders"])


@router.get("/traders/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(
    category: str = Query("OVERALL"),
    timePeriod: str = Query("ALL"),
    orderBy: str = Query("pnl"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    entries = await fetch_leaderboard(category, timePeriod, orderBy, limit, offset)
    return entries


@router.get("/traders/tracked", response_model=list[TrackedTraderResponse])
async def tracked_list(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return await get_tracked_traders(limit, offset)


@router.post("/traders/track/{wallet}", response_model=TrackedTraderResponse)
async def track(wallet: str):
    trader = await track_trader(wallet)
    if not trader:
        raise HTTPException(status_code=400, detail="Failed to track trader")
    return trader


@router.delete("/traders/track/{trader_id}")
async def untrack(trader_id: str):
    ok = await untrack_trader(trader_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Trader not found")
    return {"status": "ok", "deleted": trader_id}


@router.post("/traders/refresh-all")
async def refresh_all():
    count = await refresh_all_tracked_traders()
    return {"status": "ok", "refreshed": count}


@router.get("/traders/stats/summary", response_model=TraderStatsResponse)
async def stats_summary():
    return await get_stats_summary()


@router.get("/traders/{trader_id}", response_model=TraderDetailResponse)
async def trader_detail(trader_id: str):
    detail = await get_trader_detail(trader_id, auto_fetch=False)
    if not detail:
        raise HTTPException(status_code=404, detail="Trader not found")
    return detail


@router.get("/traders/{trader_id}/activity", response_model=list[TraderActivityResponse])
async def trader_activity(
    trader_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    detail = await get_trader_detail(trader_id, auto_fetch=False)
    if not detail:
        raise HTTPException(status_code=404, detail="Trader not found")
    raw = await fetch_trader_activity(detail["proxy_wallet"], limit=limit, offset=offset)
    return [
        {
            "type": a.get("type", ""),
            "side": a.get("side", ""),
            "title": a.get("title", ""),
            "slug": a.get("slug", ""),
            "icon": a.get("icon", ""),
            "outcome": a.get("outcome", ""),
            "size": float(a.get("size", 0) or 0),
            "usdc_size": float(a.get("usdcSize", 0) or 0),
            "price": float(a.get("price", 0) or 0),
            "timestamp": int(a.get("timestamp", 0) or 0),
            "transaction_hash": a.get("transactionHash", ""),
        }
        for a in raw
    ]


@router.get("/traders/{trader_id}/positions", response_model=list[TraderPositionResponse])
async def trader_positions(
    trader_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    detail = await get_trader_detail(trader_id, auto_fetch=False)
    if not detail:
        raise HTTPException(status_code=404, detail="Trader not found")
    try:
        raw = await fetch_trader_positions(detail["proxy_wallet"], limit=limit, offset=offset)
    except Exception:
        return []
    return [
        {
            "condition_id": p.get("conditionId", ""),
            "title": p.get("title", ""),
            "slug": p.get("slug", ""),
            "icon": p.get("icon", ""),
            "outcome": p.get("outcome", ""),
            "size": float(p.get("size", 0) or 0),
            "avg_price": float(p.get("avgPrice", 0) or 0),
            "cur_price": float(p.get("curPrice", 0) or 0),
            "initial_value": float(p.get("initialValue", 0) or 0),
            "current_value": float(p.get("currentValue", 0) or 0),
            "cash_pnl": float(p.get("cashPnl", 0) or 0),
            "percent_pnl": float(p.get("percentPnl", 0) or 0),
            "realized_pnl": float(p.get("realizedPnl", 0) or 0),
            "redeemable": bool(p.get("redeemable", False)),
        }
        for p in raw
    ]


@router.get("/traders/{trader_id}/trades", response_model=list[TraderTradeResponse])
async def trader_trades(
    trader_id: str,
    side: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return await get_trader_trades(trader_id, side, limit, offset)


@router.post("/traders/{trader_id}/refresh")
async def refresh(trader_id: str):
    detail = await get_trader_detail(trader_id, auto_fetch=False)
    if not detail:
        raise HTTPException(status_code=404, detail="Trader not found")
    wallet = detail["proxy_wallet"]
    await refresh_trader_profile(trader_id, wallet)
    count = await refresh_trader_trades(trader_id, wallet)
    return {"status": "ok", "trades_refreshed": count}
