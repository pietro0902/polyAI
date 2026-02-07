from fastapi import APIRouter
from app.models.schemas import HealthResponse
from app.database import supabase
from app.workers.scheduler import scheduler

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    db_ok = False
    try:
        supabase.table("markets").select("id").limit(1).execute()
        db_ok = True
    except Exception:
        pass

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        database=db_ok,
        scheduler_running=scheduler.running,
    )
