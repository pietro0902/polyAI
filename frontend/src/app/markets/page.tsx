"use client";

import { useState, useEffect } from "react";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketTable } from "@/components/market-table";
import { Button } from "@/components/button";
import { api } from "@/lib/api";
import type { Consensus } from "@/lib/types";

const statuses = ["all", "active", "closed", "resolved"];

export default function MarketsPage() {
  const [status, setStatus] = useState<string>("all");
  const { data: markets, loading } = useMarkets(
    status === "all" ? undefined : status
  );
  const [consensusMap, setConsensusMap] = useState<Record<string, Consensus>>({});

  useEffect(() => {
    api.consensus.list().then((list) => {
      const map: Record<string, Consensus> = {};
      for (const c of list) map[c.market_id] = c;
      setConsensusMap(map);
    }).catch(() => {});
  }, [markets]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Markets</h1>
        <p className="text-muted-foreground">
          All tracked Polymarket prediction markets
        </p>
      </div>

      <div className="flex gap-2">
        {statuses.map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <MarketTable markets={markets} loading={loading} consensusMap={consensusMap} />
    </div>
  );
}
