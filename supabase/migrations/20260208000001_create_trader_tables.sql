-- Tracked traders (watchlist)
CREATE TABLE tracked_traders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_wallet TEXT UNIQUE NOT NULL,
    username TEXT,
    profile_image TEXT,
    x_username TEXT,
    verified_badge BOOLEAN DEFAULT false,
    bio TEXT,
    pnl DOUBLE PRECISION DEFAULT 0,
    volume DOUBLE PRECISION DEFAULT 0,
    rank INTEGER,
    category TEXT DEFAULT 'OVERALL',
    auto_discovered BOOLEAN DEFAULT false,
    last_refreshed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trade history for tracked traders
CREATE TABLE trader_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id UUID NOT NULL REFERENCES tracked_traders(id) ON DELETE CASCADE,
    proxy_wallet TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    condition_id TEXT,
    market_title TEXT,
    market_slug TEXT,
    outcome TEXT,
    size DOUBLE PRECISION DEFAULT 0,
    price DOUBLE PRECISION DEFAULT 0,
    transaction_hash TEXT UNIQUE,
    traded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tracked_traders_pnl ON tracked_traders(pnl DESC);
CREATE INDEX idx_tracked_traders_volume ON tracked_traders(volume DESC);
CREATE INDEX idx_trader_trades_trader_id ON trader_trades(trader_id);
CREATE INDEX idx_trader_trades_traded_at ON trader_trades(traded_at DESC);
CREATE INDEX idx_trader_trades_proxy_wallet ON trader_trades(proxy_wallet);

-- Reuse existing updated_at trigger
CREATE TRIGGER tracked_traders_updated_at
    BEFORE UPDATE ON tracked_traders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tracked_traders;
ALTER PUBLICATION supabase_realtime ADD TABLE trader_trades;
