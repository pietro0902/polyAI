from app.database import supabase
from app.utils.logger import log


async def check_resolutions():
    """Check for resolved markets and compute P&L."""
    log.info("resolution_checker_started")
    try:
        from app.services.performance_tracker import resolve_market

        # Get active consensus entries where the market might be resolved
        active = (
            supabase.table("consensus")
            .select("*, markets!inner(id, polymarket_id, status, outcome)")
            .is_("resolved_at", "null")
            .execute()
        )

        resolved_count = 0
        for entry in active.data or []:
            market = entry.get("markets", {})
            if market.get("status") == "resolved" and market.get("outcome"):
                await resolve_market(entry, market["outcome"])
                resolved_count += 1
            else:
                # Check Polymarket if it's resolved upstream
                from app.services.polymarket import check_market_resolution
                resolution = await check_market_resolution(market.get("polymarket_id"))
                if resolution:
                    # Update market status
                    supabase.table("markets").update({
                        "status": "resolved",
                        "outcome": resolution,
                    }).eq("id", market["id"]).execute()
                    await resolve_market(entry, resolution)
                    resolved_count += 1

        log.info("resolution_checker_done", resolved=resolved_count)
    except Exception as e:
        log.error("resolution_checker_error", error=str(e))
