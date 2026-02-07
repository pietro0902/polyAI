from fastapi import APIRouter, HTTPException, Query
from app.database import supabase
from app.models.schemas import LlmModelCreate, LlmModelUpdate, LlmModelResponse
from app.utils.logger import log

router = APIRouter(tags=["models"])


@router.get("/models", response_model=list[LlmModelResponse])
async def list_models(enabled: bool | None = None):
    query = supabase.table("llm_models").select("*").order("created_at", desc=False)
    if enabled is not None:
        query = query.eq("enabled", enabled)
    result = query.execute()
    return result.data


@router.post("/models", response_model=LlmModelResponse, status_code=201)
async def create_model(body: LlmModelCreate):
    try:
        result = supabase.table("llm_models").insert(body.model_dump()).execute()
        log.info("model_created", name=body.name)
        return result.data[0]
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail=f"Model '{body.name}' already exists")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/models/{model_id}", response_model=LlmModelResponse)
async def update_model(model_id: str, body: LlmModelUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("llm_models")
        .update(updates)
        .eq("id", model_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Model not found")
    log.info("model_updated", model_id=model_id, updates=updates)
    return result.data[0]


@router.delete("/models/{model_id}")
async def delete_model(model_id: str):
    result = (
        supabase.table("llm_models")
        .delete()
        .eq("id", model_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Model not found")
    log.info("model_deleted", model_id=model_id)
    return {"status": "ok"}
