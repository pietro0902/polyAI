CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL CHECK (model_name IN ('gpt-4', 'claude', 'gemini')),
    prediction TEXT NOT NULL CHECK (prediction IN ('YES', 'NO', 'NO_TRADE')),
    confidence DOUBLE PRECISION DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT DEFAULT '',
    raw_response JSONB DEFAULT '{}'::jsonb,
    response_time_ms INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(market_id, model_name)
);

CREATE INDEX idx_predictions_market_id ON predictions(market_id);
CREATE INDEX idx_predictions_model_name ON predictions(model_name);
