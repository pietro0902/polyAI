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
