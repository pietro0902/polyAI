from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.utils.logger import setup_logging, log
from app.workers.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    log.info("app_starting")
    start_scheduler()
    yield
    stop_scheduler()
    log.info("app_stopped")


app = FastAPI(title="PolyAIbot", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.routers import health, markets, predictions, consensus, performance, models  # noqa: E402

app.include_router(health.router, prefix="/api")
app.include_router(markets.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(consensus.router, prefix="/api")
app.include_router(performance.router, prefix="/api")
app.include_router(models.router, prefix="/api")
