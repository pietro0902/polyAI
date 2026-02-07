from fastapi import APIRouter
from app.database import supabase
from app.models.schemas import PerformanceSummary, ModelPerformance, PnlPoint
from app.services.performance_tracker import (
    compute_summary,
    compute_by_model,
    compute_pnl_history,
)

router = APIRouter(tags=["performance"])


@router.get("/performance/summary", response_model=PerformanceSummary)
async def performance_summary():
    return await compute_summary()


@router.get("/performance/by-model", response_model=list[ModelPerformance])
async def performance_by_model():
    return await compute_by_model()


@router.get("/performance/pnl-history", response_model=list[PnlPoint])
async def pnl_history():
    return await compute_pnl_history()
