from fastapi import APIRouter, Query
from app.database import supabase
from app.models.schemas import ConsensusResponse

router = APIRouter(tags=["consensus"])


@router.get("/consensus", response_model=list[ConsensusResponse])
async def list_consensus(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    result = (
        supabase.table("consensus")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


@router.get("/consensus/active", response_model=list[ConsensusResponse])
async def active_consensus():
    result = (
        supabase.table("consensus")
        .select("*")
        .is_("resolved_at", "null")
        .neq("final_decision", "NO_TRADE")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data
