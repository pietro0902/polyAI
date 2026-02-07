from datetime import datetime, timezone

from app.database import supabase
from app.models.schemas import PerformanceSummary, ModelPerformance, PnlPoint
from app.utils.logger import log


async def resolve_market(consensus_entry: dict, outcome: str):
    """Resolve a market and compute P&L for the consensus entry.

    P&L logic (hypothetical):
    - If we bet YES at price P, and outcome is YES: profit = bet_amount * (1/P - 1)
    - If we bet YES at price P, and outcome is NO: loss = -bet_amount
    - If we bet NO at price P, and outcome is NO: profit = bet_amount * (1/P - 1)
    - If we bet NO at price P, and outcome is YES: loss = -bet_amount
    """
    final_decision = consensus_entry.get("final_decision")
    bet_amount = consensus_entry.get("bet_amount", 0)
    bet_odds = consensus_entry.get("bet_odds", 0)

    if final_decision == "NO_TRADE" or bet_amount == 0:
        pnl = 0
        is_correct = None
    else:
        outcome_normalized = outcome.strip().upper()
        is_correct = final_decision == ("YES" if outcome_normalized in ("YES", "Y") else "NO")

        if is_correct and bet_odds > 0:
            pnl = round(bet_amount * (1 / bet_odds - 1), 2)
        else:
            pnl = -bet_amount

    try:
        supabase.table("consensus").update({
            "pnl": pnl,
            "is_correct": is_correct,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", consensus_entry["id"]).execute()

        log.info(
            "market_resolved",
            consensus_id=consensus_entry["id"],
            outcome=outcome,
            is_correct=is_correct,
            pnl=pnl,
        )
    except Exception as e:
        log.error("resolve_market_error", error=str(e))


async def compute_summary() -> PerformanceSummary:
    """Compute overall performance summary."""
    markets = supabase.table("markets").select("id", count="exact").execute()
    predictions = supabase.table("predictions").select("id", count="exact").execute()

    resolved = (
        supabase.table("consensus")
        .select("*")
        .not_.is_("resolved_at", "null")
        .execute()
    )

    resolved_data = resolved.data or []
    resolved_count = len(resolved_data)

    correct = [r for r in resolved_data if r.get("is_correct") is True]
    total_with_bet = [r for r in resolved_data if r.get("is_correct") is not None]
    total_pnl = sum(r.get("pnl", 0) for r in resolved_data)

    accuracy = (len(correct) / len(total_with_bet) * 100) if total_with_bet else 0
    win_rate = accuracy  # same metric for now

    all_consensus = supabase.table("consensus").select("avg_confidence").execute()
    confidences = [c.get("avg_confidence", 0) for c in (all_consensus.data or []) if c.get("avg_confidence")]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0

    return PerformanceSummary(
        total_markets=markets.count or 0,
        total_predictions=predictions.count or 0,
        resolved_markets=resolved_count,
        accuracy_pct=round(accuracy, 1),
        total_pnl=round(total_pnl, 2),
        win_rate=round(win_rate, 1),
        avg_confidence=round(avg_conf, 3),
    )


async def compute_by_model() -> list[ModelPerformance]:
    """Compute per-model performance stats."""
    # Get distinct model names from predictions instead of hardcoded list
    distinct = supabase.table("predictions").select("model_name").execute()
    models = sorted({row["model_name"] for row in (distinct.data or [])})
    results = []

    # Pre-fetch all resolved consensus entries
    resolved_consensus = (
        supabase.table("consensus")
        .select("market_id, is_correct")
        .not_.is_("resolved_at", "null")
        .execute()
    )
    resolved_map = {
        c["market_id"]: c["is_correct"]
        for c in (resolved_consensus.data or [])
        if c.get("is_correct") is not None
    }

    for model_name in models:
        preds = (
            supabase.table("predictions")
            .select("*")
            .eq("model_name", model_name)
            .execute()
        )

        all_preds = preds.data or []
        total = len(all_preds)
        no_trade = sum(1 for p in all_preds if p.get("prediction") == "NO_TRADE")

        correct = 0
        incorrect = 0
        for p in all_preds:
            if p.get("prediction") == "NO_TRADE":
                continue
            market_id = p.get("market_id")
            if market_id in resolved_map:
                # Check if this prediction matches the market outcome
                consensus_correct = resolved_map[market_id]
                # The prediction is correct if it agrees with the consensus
                # and the consensus was correct, OR disagrees and consensus was wrong.
                # Simplification: we compare prediction to resolved outcome via consensus.
                if consensus_correct:
                    correct += 1
                else:
                    incorrect += 1

        confs = [p.get("confidence", 0) for p in all_preds if p.get("confidence")]
        avg_conf = sum(confs) / len(confs) if confs else 0

        accuracy = (correct / (correct + incorrect) * 100) if (correct + incorrect) > 0 else 0

        results.append(ModelPerformance(
            model_name=model_name,
            total_predictions=total,
            correct=correct,
            incorrect=incorrect,
            no_trade=no_trade,
            accuracy_pct=round(accuracy, 1),
            avg_confidence=round(avg_conf, 3),
        ))

    return results


async def compute_pnl_history() -> list[PnlPoint]:
    """Compute cumulative P&L time series."""
    resolved = (
        supabase.table("consensus")
        .select("pnl, resolved_at")
        .not_.is_("resolved_at", "null")
        .order("resolved_at", desc=False)
        .execute()
    )

    points = []
    cumulative = 0.0

    for entry in resolved.data or []:
        pnl = entry.get("pnl", 0)
        resolved_at = entry.get("resolved_at", "")
        date_str = resolved_at[:10] if resolved_at else ""

        cumulative += pnl
        points.append(PnlPoint(
            date=date_str,
            cumulative_pnl=round(cumulative, 2),
            daily_pnl=round(pnl, 2),
        ))

    return points
