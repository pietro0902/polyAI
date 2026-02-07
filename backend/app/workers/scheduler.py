from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.config import settings
from app.utils.logger import log

scheduler = AsyncIOScheduler()


def start_scheduler():
    from app.workers.market_poller import poll_markets
    from app.workers.odds_updater import update_odds
    from app.workers.resolution_checker import check_resolutions

    scheduler.add_job(
        poll_markets,
        IntervalTrigger(minutes=settings.market_poll_interval_minutes),
        id="market_poller",
        name="Poll Polymarket for new markets",
        replace_existing=True,
    )

    scheduler.add_job(
        update_odds,
        IntervalTrigger(minutes=settings.odds_update_interval_minutes),
        id="odds_updater",
        name="Update current odds",
        replace_existing=True,
    )

    scheduler.add_job(
        check_resolutions,
        IntervalTrigger(minutes=settings.resolution_check_interval_minutes),
        id="resolution_checker",
        name="Check resolved markets",
        replace_existing=True,
    )

    scheduler.start()
    log.info("scheduler_started", jobs=len(scheduler.get_jobs()))


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("scheduler_stopped")
