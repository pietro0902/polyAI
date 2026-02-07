DROP TABLE IF EXISTS consensus CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS markets CASCADE;

CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polymarket_id TEXT UNIQUE NOT NULL,
    question TEXT NOT NULL,
    description TEXT,
    category TEXT,
    slug TEXT,
    outcomes JSONB DEFAULT '[]'::jsonb,
    outcome_prices JSONB DEFAULT '[]'::jsonb,
    end_date TIMESTAMPTZ,
    volume DOUBLE PRECISION DEFAULT 0,
    liquidity DOUBLE PRECISION DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'resolved', 'archived')),
    outcome TEXT,
    clob_token_ids JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_polymarket_id ON markets(polymarket_id);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);
