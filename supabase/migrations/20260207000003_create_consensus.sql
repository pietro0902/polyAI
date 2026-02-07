CREATE TABLE consensus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID UNIQUE NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    final_decision TEXT NOT NULL CHECK (final_decision IN ('YES', 'NO', 'NO_TRADE')),
    avg_confidence DOUBLE PRECISION DEFAULT 0,
    agreement_ratio DOUBLE PRECISION DEFAULT 0,
    bet_amount DOUBLE PRECISION DEFAULT 0,
    bet_odds DOUBLE PRECISION DEFAULT 0,
    current_odds DOUBLE PRECISION DEFAULT 0,
    pnl DOUBLE PRECISION,
    is_correct BOOLEAN,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consensus_market_id ON consensus(market_id);
CREATE INDEX idx_consensus_final_decision ON consensus(final_decision);
CREATE INDEX idx_consensus_resolved_at ON consensus(resolved_at);
