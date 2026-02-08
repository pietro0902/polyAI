from app.database import supabase
from app.utils.logger import log


async def compute_consensus(market: dict, predictions: list[dict]) -> dict | None:
    """Compute consensus from predictions and store in DB.

    Logic:
    1. Count ALL votes including NO_TRADE
    2. If NO_TRADE is the majority → NO_TRADE
    3. Otherwise YES vs NO majority, then EV check
    """
    market_id = market["id"]

    # Filter out only errors, keep NO_TRADE as a real vote
    valid = [p for p in predictions if not p.get("error")]

    if not valid:
        consensus_row = {
            "market_id": market_id,
            "final_decision": "NO_TRADE",
            "avg_confidence": 0,
            "agreement_ratio": 0,
            "bet_amount": 0,
            "bet_odds": 0,
            "current_odds": 0,
        }
        return _upsert_consensus(consensus_row)

    # Count all three categories
    yes_votes = [p for p in valid if p["prediction"] == "YES"]
    no_votes = [p for p in valid if p["prediction"] == "NO"]
    no_trade_votes = [p for p in valid if p["prediction"] == "NO_TRADE"]

    total_valid = len(valid)
    yes_count = len(yes_votes)
    no_count = len(no_votes)
    no_trade_count = len(no_trade_votes)

    # If NO_TRADE is the plurality → NO_TRADE immediately
    if no_trade_count >= yes_count and no_trade_count >= no_count:
        all_confidences = [p.get("confidence", 0) for p in valid]
        avg_confidence = sum(all_confidences) / len(all_confidences)
        outcome_prices = market.get("outcome_prices", [])
        consensus_row = {
            "market_id": market_id,
            "final_decision": "NO_TRADE",
            "avg_confidence": round(avg_confidence, 4),
            "agreement_ratio": round(no_trade_count / total_valid, 4),
            "bet_amount": 0,
            "bet_odds": 0,
            "current_odds": float(outcome_prices[0]) if outcome_prices else 0,
        }
        log.info(
            "ev_calculation",
            market_id=market_id,
            majority="NO_TRADE",
            no_trade_votes=no_trade_count,
            total_votes=total_valid,
            decision="NO_TRADE",
        )
        return _upsert_consensus(consensus_row)

    # YES vs NO majority
    if yes_count > no_count:
        majority = "YES"
        majority_count = yes_count
        majority_preds = yes_votes
    elif no_count > yes_count:
        majority = "NO"
        majority_count = no_count
        majority_preds = no_votes
    else:
        # Tie: break by sum of confidence
        yes_conf = sum(p.get("confidence", 0) for p in yes_votes)
        no_conf = sum(p.get("confidence", 0) for p in no_votes)
        if yes_conf >= no_conf:
            majority = "YES"
            majority_count = yes_count
            majority_preds = yes_votes
        else:
            majority = "NO"
            majority_count = no_count
            majority_preds = no_votes

    # Calculate metrics
    all_confidences = [p.get("confidence", 0) for p in valid if p["prediction"] != "NO_TRADE"]
    avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0
    agreement_ratio = majority_count / total_valid if total_valid > 0 else 0

    # AI estimated probability for the majority direction
    majority_confidences = [p.get("confidence", 0) for p in majority_preds]
    ai_probability = sum(majority_confidences) / len(majority_confidences) if majority_confidences else 0

    # Market prices
    outcome_prices = market.get("outcome_prices", [])
    yes_price = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
    no_price = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5

    # Expected Value calculation
    # EV = (prob_AI × profit) - ((1 - prob_AI) × cost)
    # For YES bet: profit = 1 - yes_price, cost = yes_price
    # For NO bet:  profit = 1 - no_price,  cost = no_price
    if majority == "YES":
        market_price = yes_price
    else:
        market_price = no_price

    ev = (ai_probability * (1 - market_price)) - ((1 - ai_probability) * market_price)
    edge = ai_probability - market_price

    # Decision follows majority vote; EV is informational only
    final_decision = majority

    # Bet odds
    if final_decision == "YES":
        bet_odds = yes_price
    elif final_decision == "NO":
        bet_odds = no_price
    else:
        bet_odds = 0

    current_odds = yes_price

    # Bet amount scaled by edge magnitude (higher edge = bigger bet)
    bet_amount = round(max(edge, 0) * 200, 2) if final_decision != "NO_TRADE" else 0

    log.info(
        "ev_calculation",
        market_id=market_id,
        majority=majority,
        ai_probability=round(ai_probability, 4),
        market_price=round(market_price, 4),
        ev=round(ev, 4),
        edge=round(edge, 4),
        decision=final_decision,
    )

    consensus_row = {
        "market_id": market_id,
        "final_decision": final_decision,
        "avg_confidence": round(avg_confidence, 4),
        "agreement_ratio": round(agreement_ratio, 4),
        "bet_amount": bet_amount,
        "bet_odds": round(bet_odds, 4),
        "current_odds": round(current_odds, 4),
    }

    return _upsert_consensus(consensus_row)


def _upsert_consensus(row: dict) -> dict | None:
    try:
        result = (
            supabase.table("consensus")
            .upsert(row, on_conflict="market_id")
            .execute()
        )
        if result.data:
            log.info("consensus_stored", market_id=row["market_id"], decision=row["final_decision"])
            return result.data[0]
    except Exception as e:
        log.error("consensus_store_error", error=str(e), market_id=row["market_id"])
    return None
