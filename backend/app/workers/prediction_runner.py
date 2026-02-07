from app.database import supabase
from app.utils.logger import log


async def run_predictions_for_market(market: dict) -> list[dict]:
    """Run all 3 LLM predictions for a single market and compute consensus."""
    from app.services.llm_predictor import get_all_predictions
    from app.services.consensus_engine import compute_consensus

    log.info("prediction_runner_started", market_id=market["id"])
    predictions = await get_all_predictions(market)

    # Store predictions
    stored = []
    for pred in predictions:
        try:
            result = (
                supabase.table("predictions")
                .upsert(pred, on_conflict="market_id,model_name")
                .execute()
            )
            if result.data:
                stored.extend(result.data)
        except Exception as e:
            log.error("prediction_store_error", error=str(e), model=pred.get("model_name"))

    # Compute and store consensus
    if stored:
        await compute_consensus(market, stored)

    return stored


async def run_predictions_for_new_markets():
    """Find markets without predictions and run LLMs on them."""
    log.info("checking_for_new_markets_needing_predictions")
    try:
        # Get active markets that don't have predictions yet
        markets = (
            supabase.table("markets")
            .select("*")
            .eq("status", "active")
            .execute()
        )

        for market in markets.data or []:
            existing = (
                supabase.table("predictions")
                .select("id")
                .eq("market_id", market["id"])
                .execute()
            )
            if not existing.data:
                await run_predictions_for_market(market)
    except Exception as e:
        log.error("prediction_runner_batch_error", error=str(e))
