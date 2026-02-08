from datetime import datetime, timezone

import httpx
from app.database import supabase
from app.utils.logger import log

DATA_API_BASE = "https://data-api.polymarket.com"


async def fetch_leaderboard(
    category: str = "OVERALL",
    time_period: str = "ALL",
    order_by: str = "pnl",
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """Fetch leaderboard from Polymarket Data API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{DATA_API_BASE}/v1/leaderboard",
            params={
                "category": category,
                "timePeriod": time_period,
                "orderBy": order_by,
                "limit": limit,
                "offset": offset,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_trader_profile(wallet: str) -> dict | None:
    """Fetch public profile for a wallet."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{DATA_API_BASE}/v1/public-profile/{wallet}")
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()


async def fetch_trader_trades(
    wallet: str, limit: int = 100, offset: int = 0
) -> list[dict]:
    """Fetch trade history for a wallet."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{DATA_API_BASE}/v1/trades",
            params={"user": wallet, "limit": limit, "offset": offset},
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_trader_activity(
    wallet: str, limit: int = 100, offset: int = 0
) -> list[dict]:
    """Fetch activity feed for a wallet from Polymarket Data API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{DATA_API_BASE}/v1/activity",
            params={"user": wallet, "limit": limit, "offset": offset},
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_trader_positions(
    wallet: str, limit: int = 100, offset: int = 0
) -> list[dict]:
    """Fetch current positions for a wallet from Polymarket Data API."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(
            f"{DATA_API_BASE}/v1/positions",
            params={"user": wallet, "limit": limit, "offset": offset},
        )
        resp.raise_for_status()
        return resp.json()


async def track_trader(wallet: str) -> dict | None:
    """Add a trader to the watchlist and fetch their initial data."""
    try:
        profile = await fetch_trader_profile(wallet)
        row = {
            "proxy_wallet": wallet,
            "username": (profile or {}).get("userName"),
            "profile_image": (profile or {}).get("profileImage"),
            "x_username": (profile or {}).get("xUsername"),
            "verified_badge": (profile or {}).get("verifiedBadge", False),
            "bio": (profile or {}).get("bio"),
        }

        # Fetch PnL and volume from positions
        stats = await _compute_wallet_stats(wallet)
        row["pnl"] = stats["pnl"]
        row["volume"] = stats["volume"]

        result = (
            supabase.table("tracked_traders")
            .upsert(row, on_conflict="proxy_wallet")
            .execute()
        )
        if not result.data:
            return None

        trader = result.data[0]
        await _ingest_trades(trader["id"], wallet)
        return trader
    except Exception as e:
        log.error("track_trader_error", wallet=wallet, error=str(e))
        return None


async def untrack_trader(trader_id: str) -> bool:
    """Remove a trader from the watchlist (cascade deletes trades)."""
    try:
        supabase.table("tracked_traders").delete().eq("id", trader_id).execute()
        return True
    except Exception as e:
        log.error("untrack_trader_error", trader_id=trader_id, error=str(e))
        return False


async def refresh_trader_trades(trader_id: str, wallet: str) -> int:
    """Refresh trades for a single trader. Returns count of new trades."""
    return await _ingest_trades(trader_id, wallet)


async def refresh_trader_profile(trader_id: str, wallet: str) -> dict | None:
    """Refresh profile info and stats for a single trader."""
    try:
        profile = await fetch_trader_profile(wallet)
        if not profile:
            return None

        stats = await _compute_wallet_stats(wallet)
        row = {
            "username": profile.get("userName"),
            "profile_image": profile.get("profileImage"),
            "x_username": profile.get("xUsername"),
            "verified_badge": profile.get("verifiedBadge", False),
            "bio": profile.get("bio"),
            "pnl": stats["pnl"],
            "volume": stats["volume"],
            "last_refreshed_at": "now()",
        }
        result = (
            supabase.table("tracked_traders")
            .update(row)
            .eq("id", trader_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        log.error("refresh_profile_error", trader_id=trader_id, error=str(e))
        return None


async def refresh_all_tracked_traders() -> int:
    """Refresh profile and trades for all tracked traders."""
    result = supabase.table("tracked_traders").select("id, proxy_wallet").execute()
    traders = result.data or []
    refreshed = 0
    for t in traders:
        await refresh_trader_profile(t["id"], t["proxy_wallet"])
        await _ingest_trades(t["id"], t["proxy_wallet"])
        refreshed += 1
    return refreshed


async def get_tracked_traders(limit: int = 50, offset: int = 0) -> list[dict]:
    """Get all tracked traders ordered by PnL."""
    result = (
        supabase.table("tracked_traders")
        .select("*")
        .order("pnl", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []


async def get_trader_detail(trader_id: str, auto_fetch: bool = False) -> dict | None:
    """Get trader info with trade counts.

    When auto_fetch=True, fetches historical trades from the Polymarket
    API on-demand (used by refresh). Default is False for fast page loads.
    Trades are served separately via get_trader_trades with pagination.
    """
    result = (
        supabase.table("tracked_traders")
        .select("*")
        .eq("id", trader_id)
        .execute()
    )
    if not result.data:
        return None

    trader = result.data[0]

    # Auto-fetch historical trades from Polymarket (heavy, only on explicit refresh)
    if auto_fetch:
        await _ingest_trades(trader["id"], trader["proxy_wallet"], limit=1000)
        await refresh_trader_profile(trader["id"], trader["proxy_wallet"])
        refreshed = (
            supabase.table("tracked_traders")
            .select("*")
            .eq("id", trader_id)
            .execute()
        )
        if refreshed.data:
            trader = refreshed.data[0]

    # Just get counts, not full trade data
    count_result = (
        supabase.table("trader_trades")
        .select("id, market_slug", count="exact")
        .eq("trader_id", trader_id)
        .execute()
    )
    trade_rows = count_result.data or []
    market_slugs = {t["market_slug"] for t in trade_rows if t.get("market_slug")}

    trader["trades"] = []
    trader["trade_count"] = count_result.count or 0
    trader["active_markets"] = len(market_slugs)
    return trader


async def get_trader_trades(
    trader_id: str, side: str | None = None, limit: int = 50, offset: int = 0
) -> list[dict]:
    """Get paginated trades for a trader."""
    q = (
        supabase.table("trader_trades")
        .select("*")
        .eq("trader_id", trader_id)
        .order("traded_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if side:
        q = q.eq("side", side)
    result = q.execute()
    return result.data or []


async def get_stats_summary() -> dict:
    """Get summary stats for all tracked traders."""
    traders_result = (
        supabase.table("tracked_traders").select("id, pnl, username").execute()
    )
    traders = traders_result.data or []

    trades_result = supabase.table("trader_trades").select("id", count="exact").execute()
    total_trades = trades_result.count or 0

    pnls = [t["pnl"] for t in traders if t.get("pnl")]
    avg_pnl = sum(pnls) / len(pnls) if pnls else 0

    top = max(traders, key=lambda t: t.get("pnl", 0)) if traders else None
    top_trader = top.get("username") or top.get("id") if top else None

    return {
        "total_tracked": len(traders),
        "total_trades": total_trades,
        "avg_pnl": round(avg_pnl, 2),
        "top_trader": top_trader,
    }


async def _ingest_trades(trader_id: str, wallet: str, limit: int = 200) -> int:
    """Fetch and upsert trades for a trader. Returns count of new trades."""
    try:
        raw_trades = await fetch_trader_trades(wallet, limit=limit)
        new_count = 0
        for t in raw_trades:
            tx_hash = t.get("transactionHash")
            if not tx_hash:
                continue
            row = {
                "trader_id": trader_id,
                "proxy_wallet": wallet,
                "side": t.get("side", "BUY"),
                "condition_id": t.get("conditionId"),
                "market_title": t.get("title") or t.get("marketTitle"),
                "market_slug": t.get("marketSlug") or t.get("slug"),
                "outcome": t.get("outcome"),
                "size": float(t.get("size", 0) or 0),
                "price": float(t.get("price", 0) or 0),
                "transaction_hash": tx_hash,
                "traded_at": _parse_timestamp(t.get("createdAt") or t.get("timestamp")),
            }
            if not row["traded_at"]:
                continue
            try:
                supabase.table("trader_trades").upsert(
                    row, on_conflict="transaction_hash"
                ).execute()
                new_count += 1
            except Exception as e:
                log.warning("trade_upsert_skip", tx=tx_hash, error=str(e))
        return new_count
    except Exception as e:
        log.error("ingest_trades_error", trader_id=trader_id, error=str(e))
        return 0


async def _compute_wallet_stats(wallet: str) -> dict:
    """Compute PnL and volume from a wallet's positions."""
    try:
        positions = await fetch_trader_positions(wallet, limit=500)
        total_pnl = sum(float(p.get("cashPnl", 0) or 0) for p in positions)
        total_volume = sum(float(p.get("initialValue", 0) or 0) for p in positions)
        return {"pnl": round(total_pnl, 2), "volume": round(total_volume, 2)}
    except Exception as e:
        log.warning("compute_wallet_stats_error", wallet=wallet, error=str(e))
        return {"pnl": 0, "volume": 0}


def _parse_timestamp(value) -> str | None:
    """Convert a timestamp (unix epoch or ISO string) to ISO 8601 string."""
    if value is None:
        return None
    # If it's a pure number (unix epoch seconds)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
    s = str(value)
    # Numeric string -> unix epoch
    if s.isdigit():
        return datetime.fromtimestamp(int(s), tz=timezone.utc).isoformat()
    # Already an ISO string
    return s
