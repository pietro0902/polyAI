import type {
  Market,
  MarketDetail,
  LlmModel,
  Prediction,
  Consensus,
  PerformanceSummary,
  ModelPerformance,
  PnlPoint,
  ExploreMarket,
  LeaderboardEntry,
  TrackedTrader,
  TraderDetail,
  TraderTrade,
  TraderActivity,
  TraderPosition,
  TraderStats,
} from "./types";

const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function mutateJson<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  markets: {
    list: (params?: { status?: string; category?: string; page?: number }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.set("status", params.status);
      if (params?.category) sp.set("category", params.category);
      if (params?.page) sp.set("page", String(params.page));
      const qs = sp.toString();
      return fetchJson<Market[]>(`/markets${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => fetchJson<MarketDetail>(`/markets/${id}`),
    refresh: () => postJson<{ status: string; new_markets: number }>("/markets/refresh"),
  },
  predictions: {
    get: (marketId: string) => fetchJson<Prediction[]>(`/predictions/${marketId}`),
    run: (marketId: string) =>
      postJson<{ status: string; predictions: number }>(`/predictions/${marketId}/run`),
  },
  consensus: {
    list: () => fetchJson<Consensus[]>("/consensus"),
    active: () => fetchJson<Consensus[]>("/consensus/active"),
  },
  performance: {
    summary: () => fetchJson<PerformanceSummary>("/performance/summary"),
    byModel: () => fetchJson<ModelPerformance[]>("/performance/by-model"),
    pnlHistory: () => fetchJson<PnlPoint[]>("/performance/pnl-history"),
  },
  explore: {
    list: (category?: string) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : "";
      return fetchJson<Record<string, ExploreMarket[]>>(`/explore${qs}`);
    },
    track: (polymarketId: string) =>
      postJson<{ status: string; tracked: boolean; polymarket_id: string }>(
        `/explore/track/${polymarketId}`
      ),
  },
  models: {
    list: (enabled?: boolean) => {
      const qs = enabled !== undefined ? `?enabled=${enabled}` : "";
      return fetchJson<LlmModel[]>(`/models${qs}`);
    },
    create: (data: { name: string; display_name: string; openrouter_id: string }) =>
      mutateJson<LlmModel>("POST", "/models", data),
    update: (id: string, data: Partial<Pick<LlmModel, "display_name" | "openrouter_id" | "enabled">>) =>
      mutateJson<LlmModel>("PUT", `/models/${id}`, data),
    delete: (id: string) => mutateJson<{ status: string }>("DELETE", `/models/${id}`),
  },
  traders: {
    leaderboard: (params?: { category?: string; timePeriod?: string; orderBy?: string; limit?: number; offset?: number }) => {
      const sp = new URLSearchParams();
      if (params?.category) sp.set("category", params.category);
      if (params?.timePeriod) sp.set("timePeriod", params.timePeriod);
      if (params?.orderBy) sp.set("orderBy", params.orderBy);
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.offset) sp.set("offset", String(params.offset));
      const qs = sp.toString();
      return fetchJson<LeaderboardEntry[]>(`/traders/leaderboard${qs ? `?${qs}` : ""}`);
    },
    tracked: () => fetchJson<TrackedTrader[]>("/traders/tracked"),
    track: (wallet: string) => postJson<TrackedTrader>(`/traders/track/${wallet}`),
    untrack: (traderId: string) =>
      mutateJson<{ status: string; deleted: string }>("DELETE", `/traders/track/${traderId}`),
    get: (traderId: string) => fetchJson<TraderDetail>(`/traders/${traderId}`),
    activity: (traderId: string, params?: { limit?: number; offset?: number }) => {
      const sp = new URLSearchParams();
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.offset) sp.set("offset", String(params.offset));
      const qs = sp.toString();
      return fetchJson<TraderActivity[]>(`/traders/${traderId}/activity${qs ? `?${qs}` : ""}`);
    },
    positions: (traderId: string, params?: { limit?: number; offset?: number }) => {
      const sp = new URLSearchParams();
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.offset) sp.set("offset", String(params.offset));
      const qs = sp.toString();
      return fetchJson<TraderPosition[]>(`/traders/${traderId}/positions${qs ? `?${qs}` : ""}`);
    },
    trades: (traderId: string, params?: { side?: string; limit?: number; offset?: number }) => {
      const sp = new URLSearchParams();
      if (params?.side) sp.set("side", params.side);
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.offset) sp.set("offset", String(params.offset));
      const qs = sp.toString();
      return fetchJson<TraderTrade[]>(`/traders/${traderId}/trades${qs ? `?${qs}` : ""}`);
    },
    refresh: (traderId: string) => postJson<{ status: string; trades_refreshed: number }>(`/traders/${traderId}/refresh`),
    refreshAll: () => postJson<{ status: string; refreshed: number }>("/traders/refresh-all"),
    stats: () => fetchJson<TraderStats>("/traders/stats/summary"),
  },
};
