"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Badge } from "@/components/badge";
import { Skeleton } from "@/components/skeleton";
import type { ExploreMarket } from "@/lib/types";

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function MarketCard({
  market,
  onTrack,
  tracking,
}: {
  market: ExploreMarket;
  onTrack: (id: string) => void;
  tracking: boolean;
}) {
  const yesPrice = market.outcome_prices[0];
  const noPrice = market.outcome_prices[1];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug line-clamp-3">
            {market.question}
          </CardTitle>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {market.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        <div className="flex gap-3">
          <div className="flex-1 rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2 text-center">
            <div className="text-xs text-muted-foreground">Yes</div>
            <div className="text-lg font-bold text-green-600">
              {yesPrice !== undefined ? `${(yesPrice * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
          <div className="flex-1 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-center">
            <div className="text-xs text-muted-foreground">No</div>
            <div className="text-lg font-bold text-red-600">
              {noPrice !== undefined ? `${(noPrice * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Vol: {formatVolume(market.volume)}</span>
          <span>Liq: {formatVolume(market.liquidity)}</span>
        </div>

        <div className="mt-auto">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onTrack(market.id)}
            disabled={tracking}
          >
            {tracking ? "Tracking..." : "Track"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExplorePage() {
  const [grouped, setGrouped] = useState<Record<string, ExploreMarket[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [trackingIds, setTrackingIds] = useState<Set<string>>(new Set());
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.explore.list();
      setGrouped(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load markets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const categories = ["All", ...Object.keys(grouped).sort()];

  const visibleMarkets: ExploreMarket[] =
    activeCategory === "All"
      ? Object.values(grouped).flat()
      : grouped[activeCategory] || [];

  const handleTrack = async (polymarketId: string) => {
    setTrackingIds((prev) => new Set(prev).add(polymarketId));
    try {
      await api.explore.track(polymarketId);
      setTrackedIds((prev) => new Set(prev).add(polymarketId));
    } catch {
      // silently fail, button stays available
    } finally {
      setTrackingIds((prev) => {
        const next = new Set(prev);
        next.delete(polymarketId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Explore Markets</h1>
          <p className="text-muted-foreground">
            Browse live Polymarket markets by category
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMarkets} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
            {cat !== "All" && grouped[cat] && (
              <span className="ml-1.5 text-xs opacity-60">
                {grouped[cat].length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onTrack={handleTrack}
              tracking={
                trackingIds.has(market.id) || trackedIds.has(market.id)
              }
            />
          ))}
          {visibleMarkets.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-12">
              No markets found in this category.
            </p>
          )}
        </div>
      )}

      {!loading && visibleMarkets.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {visibleMarkets.length} markets
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
        </p>
      )}
    </div>
  );
}
