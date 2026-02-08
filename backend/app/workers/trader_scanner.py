from app.database import supabase
from app.utils.logger import log


async def scan_top_traders() -> int:
    """Auto-discover top traders and refresh all tracked traders."""
    from app.services.trader_tracker import (
        fetch_leaderboard,
        refresh_all_tracked_traders,
    )

    log.info("trader_scanner_started")
    try:
        # 1. Fetch top 10 from leaderboard
        entries = await fetch_leaderboard(limit=10)
        new_tracked = 0

        for entry in entries:
            wallet = entry.get("proxyWallet")
            if not wallet:
                continue

            # Check if already tracked
            existing = (
                supabase.table("tracked_traders")
                .select("id")
                .eq("proxy_wallet", wallet)
                .execute()
            )
            if existing.data:
                # Update leaderboard stats
                supabase.table("tracked_traders").update({
                    "pnl": float(entry.get("pnl", 0) or 0),
                    "volume": float(entry.get("vol", 0) or 0),
                    "rank": entry.get("rank"),
                    "username": entry.get("userName") or existing.data[0].get("username"),
                }).eq("id", existing.data[0]["id"]).execute()
                continue

            # Auto-track new top trader
            row = {
                "proxy_wallet": wallet,
                "username": entry.get("userName"),
                "profile_image": entry.get("profileImage"),
                "x_username": entry.get("xUsername"),
                "verified_badge": entry.get("verifiedBadge", False),
                "pnl": float(entry.get("pnl", 0) or 0),
                "volume": float(entry.get("vol", 0) or 0),
                "rank": entry.get("rank"),
                "auto_discovered": True,
            }
            try:
                supabase.table("tracked_traders").upsert(
                    row, on_conflict="proxy_wallet"
                ).execute()
                new_tracked += 1
            except Exception as e:
                log.warning("auto_track_skip", wallet=wallet, error=str(e))

        # 2. Refresh all tracked traders' profiles and trades
        refreshed = await refresh_all_tracked_traders()

        log.info(
            "trader_scanner_done",
            new_tracked=new_tracked,
            refreshed=refreshed,
        )
        return new_tracked
    except Exception as e:
        log.error("trader_scanner_error", error=str(e))
        return 0
