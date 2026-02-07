"use client";

import { useMarkets } from "@/hooks/useMarkets";
import { usePerformance } from "@/hooks/usePerformance";
import { StatCard } from "@/components/stat-card";
import { MarketTable } from "@/components/market-table";
import { PnlChart } from "@/components/pnl-chart";
import { formatUsd } from "@/lib/utils";
import { Button } from "@/components/button";
import { api } from "@/lib/api";
import { useState } from "react";

export default function DashboardPage() {
  const { data: markets, loading: marketsLoading, refresh: refreshMarkets } = useMarkets("active");
  const { summary, pnlHistory, loading: perfLoading } = usePerformance();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.markets.refresh();
      await refreshMarkets();
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time prediction aggregation from 3 LLMs
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          {refreshing ? "Refreshing..." : "Refresh Markets"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Markets"
          value={summary?.total_markets ?? 0}
          subtitle={`${summary?.resolved_markets ?? 0} resolved`}
          loading={perfLoading}
        />
        <StatCard
          title="Accuracy"
          value={`${summary?.accuracy_pct ?? 0}%`}
          subtitle={`${summary?.total_predictions ?? 0} predictions`}
          loading={perfLoading}
        />
        <StatCard
          title="Total P&L"
          value={formatUsd(summary?.total_pnl ?? 0)}
          subtitle="Hypothetical"
          loading={perfLoading}
        />
        <StatCard
          title="Avg Confidence"
          value={`${((summary?.avg_confidence ?? 0) * 100).toFixed(1)}%`}
          subtitle="Across all models"
          loading={perfLoading}
        />
      </div>

      <PnlChart data={pnlHistory} />

      <div>
        <h2 className="text-lg font-semibold mb-4">Active Markets</h2>
        <MarketTable markets={markets} loading={marketsLoading} />
      </div>
    </div>
  );
}
