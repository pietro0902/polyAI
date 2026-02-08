export interface Market {
  id: string;
  polymarket_id: string;
  question: string;
  description: string | null;
  category: string | null;
  slug: string | null;
  event_slug: string | null;
  polymarket_url: string | null;
  outcomes: string[];
  outcome_prices: number[];
  end_date: string | null;
  volume: number;
  liquidity: number;
  status: "active" | "closed" | "resolved" | "archived";
  outcome: string | null;
  clob_token_ids: string[];
  web_research: string | null;
  web_research_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LlmModel {
  id: string;
  name: string;
  display_name: string;
  openrouter_id: string;
  enabled: boolean;
  created_at: string;
}

export interface Prediction {
  id: string;
  market_id: string;
  model_name: string;
  prediction: "YES" | "NO" | "NO_TRADE";
  confidence: number;
  reasoning: string;
  raw_response: Record<string, unknown>;
  response_time_ms: number;
  error: string | null;
  created_at: string;
}

export interface Consensus {
  id: string;
  market_id: string;
  final_decision: "YES" | "NO" | "NO_TRADE";
  avg_confidence: number;
  agreement_ratio: number;
  bet_amount: number;
  bet_odds: number;
  current_odds: number;
  pnl: number | null;
  is_correct: boolean | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketDetail extends Market {
  predictions: Prediction[];
  consensus: Consensus | null;
}

export interface PerformanceSummary {
  total_markets: number;
  total_predictions: number;
  resolved_markets: number;
  accuracy_pct: number;
  total_pnl: number;
  win_rate: number;
  avg_confidence: number;
}

export interface ModelPerformance {
  model_name: string;
  total_predictions: number;
  correct: number;
  incorrect: number;
  no_trade: number;
  accuracy_pct: number;
  avg_confidence: number;
}

export interface PnlPoint {
  date: string;
  cumulative_pnl: number;
  daily_pnl: number;
}

export interface LeaderboardEntry {
  rank: number;
  userName: string;
  proxyWallet: string;
  vol: number;
  pnl: number;
  profileImage: string;
  xUsername: string;
  verifiedBadge: boolean;
}

export interface TrackedTrader {
  id: string;
  proxy_wallet: string;
  username: string | null;
  profile_image: string | null;
  x_username: string | null;
  verified_badge: boolean;
  bio: string | null;
  pnl: number;
  volume: number;
  rank: number | null;
  category: string;
  auto_discovered: boolean;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TraderTrade {
  id: string;
  trader_id: string;
  proxy_wallet: string;
  side: "BUY" | "SELL";
  condition_id: string | null;
  market_title: string | null;
  market_slug: string | null;
  outcome: string | null;
  size: number;
  price: number;
  transaction_hash: string | null;
  traded_at: string;
  created_at: string;
}

export interface TraderActivity {
  type: string;
  side: string;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  size: number;
  usdc_size: number;
  price: number;
  timestamp: number;
  transaction_hash: string;
}

export interface TraderPosition {
  condition_id: string;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  size: number;
  avg_price: number;
  cur_price: number;
  initial_value: number;
  current_value: number;
  cash_pnl: number;
  percent_pnl: number;
  realized_pnl: number;
  redeemable: boolean;
}

export interface TraderDetail extends TrackedTrader {
  trades: TraderTrade[];
  trade_count: number;
  active_markets: number;
}

export interface TraderStats {
  total_tracked: number;
  total_trades: number;
  avg_pnl: number;
  top_trader: string | null;
}

export interface ExploreMarket {
  id: string;
  question: string;
  description: string;
  category: string;
  outcomes: string[];
  outcome_prices: number[];
  volume: number;
  liquidity: number;
  end_date: string | null;
  slug: string;
}
