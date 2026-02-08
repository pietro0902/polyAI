from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# --- Enums ---

class MarketStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    RESOLVED = "resolved"
    ARCHIVED = "archived"


class PredictionChoice(str, enum.Enum):
    YES = "YES"
    NO = "NO"
    NO_TRADE = "NO_TRADE"


# --- LLM Model ---

class LlmModelCreate(BaseModel):
    name: str
    display_name: str
    openrouter_id: str


class LlmModelUpdate(BaseModel):
    display_name: str | None = None
    openrouter_id: str | None = None
    enabled: bool | None = None


class LlmModelResponse(BaseModel):
    id: str
    name: str
    display_name: str
    openrouter_id: str
    enabled: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# --- Market ---

class MarketBase(BaseModel):
    polymarket_id: str
    question: str
    description: str | None = None
    category: str | None = None
    slug: str | None = None
    event_slug: str | None = None
    polymarket_url: str | None = None
    outcomes: list[str] = Field(default_factory=list)
    outcome_prices: list[float] = Field(default_factory=list)
    end_date: datetime | None = None
    volume: float = 0
    liquidity: float = 0
    status: MarketStatus = MarketStatus.ACTIVE
    outcome: str | None = None
    clob_token_ids: list[str] = Field(default_factory=list)
    web_research: str | None = None
    web_research_at: datetime | None = None


class MarketCreate(MarketBase):
    raw_data: dict[str, Any] = Field(default_factory=dict)


class MarketResponse(MarketBase):
    id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class MarketDetail(MarketResponse):
    predictions: list[PredictionResponse] = Field(default_factory=list)
    consensus: ConsensusResponse | None = None


# --- Prediction ---

class PredictionBase(BaseModel):
    market_id: str
    model_name: str
    prediction: PredictionChoice
    confidence: float = Field(ge=0, le=1)
    reasoning: str = ""


class PredictionCreate(PredictionBase):
    raw_response: dict[str, Any] = Field(default_factory=dict)
    response_time_ms: int = 0
    error: str | None = None


class PredictionResponse(PredictionBase):
    id: str
    raw_response: dict[str, Any] = Field(default_factory=dict)
    response_time_ms: int = 0
    error: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# --- Consensus ---

class ConsensusBase(BaseModel):
    market_id: str
    final_decision: PredictionChoice
    avg_confidence: float = 0
    agreement_ratio: float = 0
    bet_amount: float = 0
    bet_odds: float = 0
    current_odds: float = 0


class ConsensusCreate(ConsensusBase):
    pass


class ConsensusResponse(ConsensusBase):
    id: str
    pnl: float | None = None
    is_correct: bool | None = None
    resolved_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


# --- Performance ---

class PerformanceSummary(BaseModel):
    total_markets: int = 0
    total_predictions: int = 0
    resolved_markets: int = 0
    accuracy_pct: float = 0
    total_pnl: float = 0
    win_rate: float = 0
    avg_confidence: float = 0


class ModelPerformance(BaseModel):
    model_name: str
    total_predictions: int = 0
    correct: int = 0
    incorrect: int = 0
    no_trade: int = 0
    accuracy_pct: float = 0
    avg_confidence: float = 0


class PnlPoint(BaseModel):
    date: str
    cumulative_pnl: float
    daily_pnl: float


# --- Traders ---

class LeaderboardEntry(BaseModel):
    rank: int = 0
    userName: str = ""
    proxyWallet: str = ""
    vol: float = 0
    pnl: float = 0
    profileImage: str = ""
    xUsername: str = ""
    verifiedBadge: bool = False


class TrackedTraderResponse(BaseModel):
    id: str
    proxy_wallet: str
    username: str | None = None
    profile_image: str | None = None
    x_username: str | None = None
    verified_badge: bool = False
    bio: str | None = None
    pnl: float = 0
    volume: float = 0
    rank: int | None = None
    category: str = "OVERALL"
    auto_discovered: bool = False
    last_refreshed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class TraderTradeResponse(BaseModel):
    id: str
    trader_id: str
    proxy_wallet: str
    side: str
    condition_id: str | None = None
    market_title: str | None = None
    market_slug: str | None = None
    outcome: str | None = None
    size: float = 0
    price: float = 0
    transaction_hash: str | None = None
    traded_at: datetime
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class TraderDetailResponse(TrackedTraderResponse):
    trades: list[TraderTradeResponse] = Field(default_factory=list)
    trade_count: int = 0
    active_markets: int = 0


class TraderActivityResponse(BaseModel):
    type: str = ""
    side: str = ""
    title: str = ""
    slug: str = ""
    icon: str = ""
    outcome: str = ""
    size: float = 0
    usdc_size: float = 0
    price: float = 0
    timestamp: int = 0
    transaction_hash: str = ""


class TraderPositionResponse(BaseModel):
    condition_id: str = ""
    title: str = ""
    slug: str = ""
    icon: str = ""
    outcome: str = ""
    size: float = 0
    avg_price: float = 0
    cur_price: float = 0
    initial_value: float = 0
    current_value: float = 0
    cash_pnl: float = 0
    percent_pnl: float = 0
    realized_pnl: float = 0
    redeemable: bool = False


class TraderStatsResponse(BaseModel):
    total_tracked: int = 0
    total_trades: int = 0
    avg_pnl: float = 0
    top_trader: str | None = None


# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"
    database: bool = False
    scheduler_running: bool = False


# Forward ref resolution
MarketDetail.model_rebuild()
