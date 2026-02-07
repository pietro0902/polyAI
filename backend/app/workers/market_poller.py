from app.utils.logger import log


async def poll_markets() -> int:
    """Poll Polymarket Gamma API for new markets and insert into DB."""
    from app.services.polymarket import fetch_active_markets, upsert_markets

    log.info("market_poller_started")
    try:
        raw_markets = await fetch_active_markets()
        count = await upsert_markets(raw_markets)
        log.info("market_poller_done", new_markets=count)
        return count
    except Exception as e:
        log.error("market_poller_error", error=str(e))
        return 0
