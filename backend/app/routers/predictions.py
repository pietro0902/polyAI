import asyncio

from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models.schemas import PredictionResponse
from app.utils.logger import log

router = APIRouter(tags=["predictions"])


@router.get("/predictions/{market_id}", response_model=list[PredictionResponse])
async def get_predictions(market_id: str):
    result = supabase.table("predictions").select("*").eq("market_id", market_id).execute()
    return result.data


@router.post("/predictions/{market_id}/run")
async def run_predictions(market_id: str):
    market = supabase.table("markets").select("*").eq("id", market_id).single().execute()
    if not market.data:
        raise HTTPException(status_code=404, detail="Market not found")

    # Delete old predictions and consensus so polling starts fresh
    supabase.table("predictions").delete().eq("market_id", market_id).execute()
    supabase.table("consensus").delete().eq("market_id", market_id).execute()

    from app.workers.prediction_runner import run_predictions_for_market

    # Fire-and-forget: launch predictions in background, respond immediately
    asyncio.create_task(run_predictions_for_market(market.data))
    return {"status": "started"}
