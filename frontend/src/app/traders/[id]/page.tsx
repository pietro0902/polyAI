"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card";
import { Skeleton } from "@/components/skeleton";
import { cn, formatUsd, formatNumber, timeAgo } from "@/lib/utils";
import type { TraderDetail, TraderActivity, TraderPosition, TraderTrade } from "@/lib/types";

function formatCents(value: number): string {
  return `${Math.round(value * 100)}\u00a2`;
}

function formatPnlPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function epochToTimeAgo(epoch: number): string {
  const seconds = Math.floor((Date.now() / 1000) - epoch);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function activityLabel(a: TraderActivity): string {
  if (a.type === "TRADE") return a.side === "BUY" ? "Buy" : "Sell";
  if (a.type === "REDEEM") return "Redeem";
  if (a.type === "MERGE") return "Merge";
  return a.type;
}

export default function TraderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [trader, setTrader] = useState<TraderDetail | null>(null);
  const [positions, setPositions] = useState<TraderPosition[]>([]);
  const [activity, setActivity] = useState<TraderActivity[]>([]);
  const [trades, setTrades] = useState<TraderTrade[]>([]);
  const [tradesHasMore, setTradesHasMore] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tab, setTab] = useState<"positions" | "trades" | "activity">("positions");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const TRADES_PAGE_SIZE = 50;
  const tradesBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.traders.get(id),
      api.traders.positions(id, { limit: 200 }),
    ])
      .then(([data, pos]) => {
        setTrader(data);
        setPositions(pos);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Load first page of trades when Trades tab is selected
  useEffect(() => {
    if (!trader || tab !== "trades" || trades.length > 0) return;
    setTradesLoading(true);
    api.traders
      .trades(id, { limit: TRADES_PAGE_SIZE, offset: 0 })
      .then((data) => {
        setTrades(data);
        setTradesHasMore(data.length >= TRADES_PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setTradesLoading(false));
  }, [id, trader, tab]);

  // Infinite scroll: load more trades when bottom sentinel is visible
  const loadMoreTrades = useCallback(() => {
    if (tradesLoading || !tradesHasMore) return;
    setTradesLoading(true);
    api.traders
      .trades(id, { limit: TRADES_PAGE_SIZE, offset: trades.length })
      .then((data) => {
        setTrades((prev) => [...prev, ...data]);
        setTradesHasMore(data.length >= TRADES_PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setTradesLoading(false));
  }, [id, trades.length, tradesLoading, tradesHasMore]);

  useEffect(() => {
    if (tab !== "trades" || !tradesHasMore) return;
    const el = tradesBottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreTrades();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab, tradesHasMore, loadMoreTrades]);

  useEffect(() => {
    if (!trader || tab !== "activity") return;
    api.traders
      .activity(id, { limit: 200 })
      .then(setActivity)
      .catch(() => {});
  }, [id, trader, tab]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.traders.refresh(id);
      const [data, pos] = await Promise.all([
        api.traders.get(id),
        api.traders.positions(id, { limit: 200 }),
      ]);
      setTrader(data);
      setPositions(pos);
      // Reset trades so they reload with fresh data
      setTrades([]);
      setTradesHasMore(true);
    } catch {
      // ignore
    }
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Trader not found</p>
        <Link href="/traders" className="text-primary hover:underline text-sm mt-2 inline-block">
          Back to Traders
        </Link>
      </div>
    );
  }

  const positionsValue = positions.reduce((s, p) => s + p.current_value, 0);
  const positionsPnl = positions.reduce((s, p) => s + p.cash_pnl, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {trader.profile_image ? (
            <img
              src={trader.profile_image}
              alt={trader.username || ""}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
              {(trader.username || trader.proxy_wallet[0] || "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {trader.username || trader.proxy_wallet.slice(0, 12)}
              </h1>
              {trader.verified_badge && (
                <span className="text-blue-500" title="Verified">&#10003;</span>
              )}
            </div>
            {trader.x_username && (
              <a
                href={`https://x.com/${trader.x_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                @{trader.x_username}
              </a>
            )}
            {trader.bio && (
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">{trader.bio}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/traders"
            className="px-3 py-1.5 text-xs font-medium rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="PnL"
          value={formatUsd(trader.pnl)}
          subtitle={trader.pnl >= 0 ? "Profit" : "Loss"}
        />
        <StatCard
          title="Positions Value"
          value={formatUsd(positionsValue)}
          subtitle={`${positions.length} positions`}
        />
        <StatCard
          title="Positions PnL"
          value={formatUsd(positionsPnl)}
          subtitle={positionsPnl >= 0 ? "Unrealized profit" : "Unrealized loss"}
        />
        <StatCard
          title="Volume"
          value={formatUsd(trader.volume)}
          subtitle="Total traded"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("positions")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "positions"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Positions ({positions.length})
        </button>
        <button
          onClick={() => setTab("trades")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "trades"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Trades {trader.trade_count > 0 && `(${trader.trade_count})`}
        </button>
        <button
          onClick={() => setTab("activity")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "activity"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Activity
        </button>
      </div>

      {/* Positions Tab */}
      {tab === "positions" && (
        <Card>
          <CardContent className="p-0">
            {positions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No open positions
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">MARKET</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">AVG</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">CURRENT</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p, i) => (
                      <tr key={`${p.condition_id}-${i}`} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.icon && (
                              <img
                                src={p.icon}
                                alt=""
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[300px]" title={p.title}>
                                {p.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className={cn(
                                  "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5",
                                  "bg-blue-50 text-blue-600"
                                )}>
                                  {p.outcome}
                                </span>
                                {formatNumber(Math.round(p.size))} shares at {formatCents(p.avg_price)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCents(p.avg_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCents(p.cur_price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold">{formatUsd(p.current_value)}</p>
                          <p className={cn(
                            "text-xs font-medium",
                            p.cash_pnl >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatUsd(p.cash_pnl)} ({formatPnlPct(p.percent_pnl)})
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trades Tab (infinite scroll) */}
      {tab === "trades" && (
        <Card>
          <CardContent className="p-0">
            {trades.length === 0 && !tradesLoading ? (
              <p className="text-muted-foreground text-center py-8">
                No trades yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">SIDE</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">MARKET</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">PRICE</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">SIZE</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => (
                      <tr key={`${t.transaction_hash}-${i}`} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded text-xs font-semibold",
                            t.side === "BUY"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          )}>
                            {t.side}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[350px]" title={t.market_title || ""}>
                              {t.market_title || "Unknown market"}
                            </p>
                            {t.outcome && (
                              <span className="text-xs text-muted-foreground">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                                  {t.outcome}
                                </span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCents(t.price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatNumber(Math.round(t.size))}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                          {timeAgo(t.traded_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Infinite scroll sentinel */}
                <div ref={tradesBottomRef} className="h-4" />
                {tradesLoading && (
                  <div className="flex justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {!tradesHasMore && trades.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground py-3">
                    All {trades.length} trades loaded
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Tab */}
      {tab === "activity" && (
        <Card>
          <CardContent className="p-0">
            {activity.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No activity yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">TYPE</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">MARKET</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((a, i) => (
                      <tr key={`${a.transaction_hash}-${i}`} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {activityLabel(a)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {a.icon && (
                              <img
                                src={a.icon}
                                alt=""
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[400px]" title={a.title}>
                                {a.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {a.outcome && (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 bg-green-50 text-green-600">
                                    {a.outcome}
                                  </span>
                                )}
                                {a.price > 0 && <>{formatCents(a.price)}</>}
                                {a.size > 0 && <>{a.price > 0 ? " " : ""}{formatNumber(Math.round(a.size * 10) / 10)} shares</>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <p className="font-semibold">{formatUsd(a.usdc_size)}</p>
                          <p className="text-xs text-muted-foreground">
                            {epochToTimeAgo(a.timestamp)}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
