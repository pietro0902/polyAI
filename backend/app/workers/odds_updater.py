from app.database import supabase
from app.utils.logger import log


async def update_odds():
    """Refresh current_odds on active consensus entries from Polymarket."""
    log.info("odds_updater_started")
    try:
        active = (
            supabase.table("consensus")
            .select("*, markets!inner(polymarket_id, outcome_prices, clob_token_ids)")
            .is_("resolved_at", "null")
            .neq("final_decision", "NO_TRADE")
            .execute()
        )

        if not active.data:
            return

        from app.services.polymarket import fetch_market_prices

        for entry in active.data:
            market_data = entry.get("markets", {})
            polymarket_id = market_data.get("polymarket_id")
            if not polymarket_id:
                continue

            try:
                prices = await fetch_market_prices(polymarket_id)
                if prices:
                    # YES price is the first outcome price
                    yes_price = prices[0] if prices else entry.get("current_odds", 0)
                    supabase.table("consensus").update(
                        {"current_odds": yes_price}
                    ).eq("id", entry["id"]).execute()
            except Exception as e:
                log.error("odds_update_single_error", market_id=polymarket_id, error=str(e))

        log.info("odds_updater_done", updated=len(active.data))
    except Exception as e:
        log.error("odds_updater_error", error=str(e))
