"use client";

import Link from "next/link";
import type { Market, Consensus } from "@/lib/types";
import { Badge } from "./badge";
import { formatPct, formatUsd, timeAgo } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface MarketTableProps {
  markets: Market[];
  loading?: boolean;
  consensusMap?: Record<string, Consensus>;
}

export function MarketTable({ markets, loading, consensusMap = {} }: MarketTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No markets found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-3 font-medium text-muted-foreground">Market</th>
            <th className="pb-3 font-medium text-muted-foreground">YES Price</th>
            <th className="pb-3 font-medium text-muted-foreground">NO Price</th>
            <th className="pb-3 font-medium text-muted-foreground">AI Prediction</th>
            <th className="pb-3 font-medium text-muted-foreground">Edge</th>
            <th className="pb-3 font-medium text-muted-foreground">Volume</th>
            <th className="pb-3 font-medium text-muted-foreground">Status</th>
            <th className="pb-3 font-medium text-muted-foreground">Added</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market) => (
            <tr key={market.id} className="border-b hover:bg-muted/50 transition-colors">
              <td className="py-3 pr-4 max-w-md">
                <Link
                  href={`/markets/${market.id}`}
                  className="font-medium hover:text-primary transition-colors line-clamp-2"
                >
                  {market.question}
                </Link>
                {market.category && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {market.category}
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 font-mono">
                {market.outcome_prices.length > 0
                  ? formatPct(market.outcome_prices[0])
                  : "—"}
              </td>
              <td className="py-3 pr-4 font-mono">
                {market.outcome_prices.length > 1
                  ? formatPct(market.outcome_prices[1])
                  : "—"}
              </td>
              <td className="py-3 pr-4">
                {consensusMap[market.id] ? (
                  <Badge
                    variant={
                      consensusMap[market.id].final_decision === "YES"
                        ? "success"
                        : consensusMap[market.id].final_decision === "NO"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {consensusMap[market.id].final_decision}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 pr-4 font-mono">
                {(() => {
                  const c = consensusMap[market.id];
                  if (!c || c.final_decision === "NO_TRADE" || !c.bet_odds) return <span className="text-muted-foreground">—</span>;
                  // Profit per share if AI is correct: pay bet_odds, receive $1
                  const profitPerShare = 1 - c.bet_odds;
                  const roi = profitPerShare / c.bet_odds;
                  return (
                    <span className="text-green-600">
                      +{(roi * 100).toFixed(0)}%
                    </span>
                  );
                })()}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">
                {formatUsd(market.volume)}
              </td>
              <td className="py-3 pr-4">
                <Badge
                  variant={
                    market.status === "active"
                      ? "success"
                      : market.status === "resolved"
                        ? "outline"
                        : "warning"
                  }
                >
                  {market.status}
                </Badge>
              </td>
              <td className="py-3 text-muted-foreground">
                {market.created_at ? timeAgo(market.created_at) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
