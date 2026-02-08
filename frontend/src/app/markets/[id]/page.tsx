"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { MarketDetail } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { PredictionBadge } from "@/components/prediction-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { Button } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import { formatPct, formatUsd, modelDisplayName, timeAgo } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const { models, displayMap } = useModels();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.markets
      .get(id)
      .then(setMarket)
      .finally(() => setLoading(false));
  }, [id]);

  const enabledModels = models.filter((m) => m.enabled);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  const handleRunPredictions = async () => {
    setRunning(true);
    // Clear old predictions from view while new ones come in
    if (market) {
      setMarket({ ...market, predictions: [], consensus: null });
    }
    try {
      await api.predictions.run(id);
      const startTime = Date.now();
      // Start polling for results every 2s
      pollRef.current = setInterval(async () => {
        try {
          const updated = await api.markets.get(id);
          setMarket(updated);
          // Stop when consensus arrives (computed after ALL predictions are done)
          // or after 3 min timeout as safety net
          if (updated.consensus || Date.now() - startTime > 180_000) {
            stopPolling();
            setRunning(false);
          }
        } catch {
          // keep polling
        }
      }, 2000);
    } catch {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!market) {
    return <div className="text-center py-8 text-muted-foreground">Market not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          {market.polymarket_url ? (
            <a
              href={market.polymarket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl font-bold hover:text-primary transition-colors"
            >
              {market.question} ↗
            </a>
          ) : (
            <h1 className="text-2xl font-bold">{market.question}</h1>
          )}
          <div className="flex items-center gap-2 mt-2">
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
            {market.category && (
              <Badge variant="outline">{market.category}</Badge>
            )}
            {market.created_at && (
              <span className="text-xs text-muted-foreground">
                Added {timeAgo(market.created_at)}
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={handleRunPredictions}
          disabled={running}
          variant="outline"
        >
          {running ? "Running..." : "Run Predictions"}
        </Button>
      </div>

      {market.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{market.description}</p>
          </CardContent>
        </Card>
      )}

      {market.web_research && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Web Research</CardTitle>
              {market.web_research_at && (
                <span className="text-xs text-muted-foreground">
                  {timeAgo(market.web_research_at)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {market.web_research}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">YES Price</p>
            <p className="text-xl font-bold">
              {market.outcome_prices.length > 0
                ? formatPct(market.outcome_prices[0])
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">NO Price</p>
            <p className="text-xl font-bold">
              {market.outcome_prices.length > 1
                ? formatPct(market.outcome_prices[1])
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-xl font-bold">{formatUsd(market.volume)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Liquidity</p>
            <p className="text-xl font-bold">{formatUsd(market.liquidity)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Consensus */}
      {market.consensus && (
        <Card>
          <CardHeader>
            <CardTitle>Consensus Decision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <PredictionBadge
                prediction={market.consensus.final_decision}
                confidence={market.consensus.avg_confidence}
              />
              <div className="text-sm text-muted-foreground">
                Agreement: {(market.consensus.agreement_ratio * 100).toFixed(0)}%
              </div>
              {market.consensus.bet_amount > 0 && (
                <div className="text-sm text-muted-foreground">
                  Hypothetical bet: {formatUsd(market.consensus.bet_amount)} at{" "}
                  {formatPct(market.consensus.bet_odds)}
                </div>
              )}
              {market.consensus.pnl !== null && (
                <div
                  className={`text-sm font-medium ${
                    market.consensus.pnl >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  P&L: {formatUsd(market.consensus.pnl)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual predictions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">LLM Predictions</h2>
        {market.predictions.length === 0 && !running ? (
          <p className="text-muted-foreground">
            No predictions yet. Click &quot;Run Predictions&quot; to generate.
          </p>
        ) : (
          (() => {
            const completedNames = new Set(market.predictions.map((p) => p.model_name));
            const pendingModels = running
              ? enabledModels.filter((m) => !completedNames.has(m.name))
              : [];
            const totalCards = market.predictions.length + pendingModels.length;
            const gridCols =
              totalCards <= 1 ? "md:grid-cols-1" : totalCards === 2 ? "md:grid-cols-2" : "md:grid-cols-3";

            return (
              <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
                {/* Completed predictions */}
                {market.predictions.map((pred) => (
                  <Card key={pred.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {modelDisplayName(pred.model_name, displayMap)}
                        </CardTitle>
                        <PredictionBadge prediction={pred.prediction} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ConfidenceBar value={pred.confidence} label="Confidence" />
                      {pred.reasoning && (
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-4">
                          {pred.reasoning}
                        </p>
                      )}
                      {pred.error && (
                        <p className="text-xs text-red-500 mt-2">Error: {pred.error}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Response time: {pred.response_time_ms}ms
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {/* Pending skeleton cards */}
                {pendingModels.map((model) => (
                  <Card key={model.id} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{model.display_name}</CardTitle>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-3 w-full rounded mb-3" />
                      <Skeleton className="h-3 w-3/4 rounded mb-2" />
                      <Skeleton className="h-3 w-5/6 rounded mb-2" />
                      <Skeleton className="h-3 w-2/3 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
