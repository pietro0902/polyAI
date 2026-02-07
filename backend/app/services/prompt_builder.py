from datetime import datetime, timezone


def _get_system_prompt() -> str:
    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"""You are an aggressive prediction market trader. You MUST take a position on every market.
Today's date: {current_date}

## CRITICAL RULES
1. You MUST answer YES or NO. Always pick a side.
2. NO_TRADE is ONLY allowed when the market is completely unknowable (e.g., pure coin flip with zero information).
3. If you have ANY lean at all, even 51/49, you MUST commit to YES or NO.
4. Your job is to PREDICT, not to hedge. Sitting out is failure.

## How to analyze
1. Read the web research carefully — it contains current real-world information
2. Estimate the TRUE probability of YES happening based on all evidence
3. Set your confidence: this is YOUR estimated probability (0.0 to 1.0)
4. Compare to the market price — the system will handle edge/EV math separately
5. Pick YES if your probability > 0.5, pick NO if your probability < 0.5

## Confidence = your estimated probability
- confidence 0.95 = you believe 95% chance this happens
- confidence 0.7 = you believe 70% chance
- confidence 0.5 = true coin flip (still pick a side if you have any lean)

You MUST respond with valid JSON only, no markdown, no explanation outside JSON."""


# Keep a module-level reference for backwards compat with _call_model
SYSTEM_PROMPT = _get_system_prompt()


def build_prediction_prompt(market: dict, research_context: str = "") -> str:
    question = market.get("question", "")
    description = market.get("description", "")
    prices = market.get("outcome_prices", [])
    volume = market.get("volume", 0)
    liquidity = market.get("liquidity", 0)
    end_date = market.get("end_date", "")

    # Calculate time remaining
    time_remaining = "Unknown"
    if end_date:
        try:
            if isinstance(end_date, str):
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            else:
                end_dt = end_date
            now = datetime.now(timezone.utc)
            delta = end_dt - now
            days = delta.days
            if days > 0:
                time_remaining = f"{days} days"
            elif delta.total_seconds() > 0:
                hours = int(delta.total_seconds() / 3600)
                time_remaining = f"{hours} hours"
            else:
                time_remaining = "Expired"
        except Exception:
            pass

    yes_price = f"{prices[0]:.2%}" if len(prices) > 0 else "N/A"
    no_price = f"{prices[1]:.2%}" if len(prices) > 1 else "N/A"

    research_section = research_context if research_context else "No recent research available. Use your best judgment from training data."

    return f"""## Market
**Question:** {question}
**Description:** {description}

## Current Prices
- YES: {yes_price} | NO: {no_price}
- Volume: ${volume:,.0f} | Liquidity: ${liquidity:,.0f}
- Time remaining: {time_remaining} (ends {end_date})

## Web Research (current real-world info)
{research_section}

## Your task
Based on ALL the evidence above, what is the TRUE probability that this resolves YES?
- If your probability > 50%, predict YES with confidence = your probability
- If your probability < 50%, predict NO with confidence = (1 - your probability)
- DO NOT default to NO_TRADE. You must pick a side.

The system will decide whether to actually trade based on EV math. Your job is just to PREDICT accurately.

Respond ONLY with valid JSON:
{{"prediction": "YES" | "NO", "confidence": <0.0-1.0>, "reasoning": "<brief analysis citing specific evidence>"}}"""
