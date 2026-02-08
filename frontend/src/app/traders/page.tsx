"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useTrackedTraders } from "@/hooks/useTraders";
import { StatCard } from "@/components/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card";
import { Skeleton } from "@/components/skeleton";
import { cn, formatUsd, formatNumber } from "@/lib/utils";
import type { LeaderboardEntry, TraderStats } from "@/lib/types";

const CATEGORIES = ["OVERALL", "POLITICS", "SPORTS", "CRYPTO"] as const;
const PERIODS = ["DAY", "WEEK", "MONTH", "ALL"] as const;

export default function TradersPage() {
  const [tab, setTab] = useState<"leaderboard" | "watchlist">("leaderboard");
  const [category, setCategory] = useState("OVERALL");
  const [period, setPeriod] = useState("ALL");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<TraderStats | null>(null);
  const [lbLoading, setLbLoading] = useState(true);
  const [tracking, setTracking] = useState<string | null>(null);

  const { data: tracked, loading: trackedLoading, refresh: refreshTracked } = useTrackedTraders();

  // Fetch leaderboard
  useEffect(() => {
    setLbLoading(true);
    api.traders
      .leaderboard({ category, timePeriod: period, limit: 20 })
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
      .finally(() => setLbLoading(false));
  }, [category, period]);

  // Fetch stats
  useEffect(() => {
    api.traders.stats().then(setStats).catch(() => {});
  }, [tracked]);

  const trackedWallets = new Set(tracked.map((t) => t.proxy_wallet));

  async function handleTrack(wallet: string) {
    setTracking(wallet);
    try {
      await api.traders.track(wallet);
      refreshTracked();
    } catch {
      // ignore
    }
    setTracking(null);
  }

  const [refreshingAll, setRefreshingAll] = useState(false);

  async function handleUntrack(traderId: string) {
    try {
      await api.traders.untrack(traderId);
      refreshTracked();
    } catch {
      // ignore
    }
  }

  async function handleRefreshAll() {
    setRefreshingAll(true);
    try {
      await api.traders.refreshAll();
      refreshTracked();
      api.traders.stats().then(setStats).catch(() => {});
    } catch {
      // ignore
    }
    setRefreshingAll(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Top Traders</h1>
        <p className="text-muted-foreground">
          Discover and track the best Polymarket traders
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tracked Traders"
          value={stats?.total_tracked ?? 0}
          subtitle="In your watchlist"
          loading={!stats}
        />
        <StatCard
          title="Total Trades"
          value={formatNumber(stats?.total_trades ?? 0)}
          subtitle="Across all traders"
          loading={!stats}
        />
        <StatCard
          title="Avg PnL"
          value={formatUsd(stats?.avg_pnl ?? 0)}
          subtitle="Average tracked trader"
          loading={!stats}
        />
        <StatCard
          title="Top Trader"
          value={stats?.top_trader ?? "-"}
          subtitle="Highest PnL"
          loading={!stats}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("leaderboard")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "leaderboard"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setTab("watchlist")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "watchlist"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Watchlist ({tracked.length})
        </button>
      </div>

      {tab === "leaderboard" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    category === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard Grid */}
          {lbLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-12 w-12 rounded-full mb-3" />
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No leaderboard data available
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaderboard.map((entry, idx) => {
                const isTracked = trackedWallets.has(entry.proxyWallet);
                return (
                  <Card key={entry.proxyWallet}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {entry.profileImage ? (
                              <img
                                src={entry.profileImage}
                                alt={entry.userName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                                {(entry.userName || "?")[0].toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                              {entry.rank || idx + 1}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm">
                                {entry.userName || entry.proxyWallet.slice(0, 8)}
                              </span>
                              {entry.verifiedBadge && (
                                <span className="text-blue-500 text-xs" title="Verified">&#10003;</span>
                              )}
                            </div>
                            {entry.xUsername && (
                              <span className="text-xs text-muted-foreground">
                                @{entry.xUsername}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground text-xs">PnL</span>
                          <p className={cn("font-semibold", entry.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatUsd(entry.pnl)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Volume</span>
                          <p className="font-semibold">{formatUsd(entry.vol)}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTrack(entry.proxyWallet)}
                        disabled={isTracked || tracking === entry.proxyWallet}
                        className={cn(
                          "w-full py-1.5 text-xs font-medium rounded transition-colors",
                          isTracked
                            ? "bg-muted text-muted-foreground cursor-default"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {tracking === entry.proxyWallet
                          ? "Tracking..."
                          : isTracked
                          ? "Tracked"
                          : "Track"}
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "watchlist" && (
        <div>
          {trackedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : tracked.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tracked traders yet. Browse the leaderboard to start tracking.
            </p>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Watchlist</CardTitle>
                  <button
                    onClick={handleRefreshAll}
                    disabled={refreshingAll}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {refreshingAll ? "Refreshing..." : "Refresh All"}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Trader</th>
                        <th className="pb-3 font-medium text-muted-foreground">PnL</th>
                        <th className="pb-3 font-medium text-muted-foreground">Volume</th>
                        <th className="pb-3 font-medium text-muted-foreground">Rank</th>
                        <th className="pb-3 font-medium text-muted-foreground">Source</th>
                        <th className="pb-3 font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracked.map((t) => (
                        <tr key={t.id} className="border-b">
                          <td className="py-3">
                            <Link
                              href={`/traders/${t.id}`}
                              className="flex items-center gap-2 hover:underline"
                            >
                              {t.profile_image ? (
                                <img
                                  src={t.profile_image}
                                  alt={t.username || ""}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                  {(t.username || t.proxy_wallet[0] || "?")[0].toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium">
                                {t.username || t.proxy_wallet.slice(0, 10)}
                              </span>
                              {t.verified_badge && (
                                <span className="text-blue-500 text-xs">&#10003;</span>
                              )}
                            </Link>
                          </td>
                          <td className={cn("py-3 font-medium", t.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatUsd(t.pnl)}
                          </td>
                          <td className="py-3">{formatUsd(t.volume)}</td>
                          <td className="py-3">{t.rank ?? "-"}</td>
                          <td className="py-3">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              t.auto_discovered
                                ? "bg-blue-50 text-blue-600"
                                : "bg-green-50 text-green-600"
                            )}>
                              {t.auto_discovered ? "Auto" : "Manual"}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleUntrack(t.id)}
                              className="text-xs text-red-500 hover:text-red-700 transition-colors"
                            >
                              Untrack
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
