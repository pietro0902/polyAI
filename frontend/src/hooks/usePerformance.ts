"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { PerformanceSummary, ModelPerformance, PnlPoint } from "@/lib/types";

export function usePerformance() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [byModel, setByModel] = useState<ModelPerformance[]>([]);
  const [pnlHistory, setPnlHistory] = useState<PnlPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m, p] = await Promise.all([
        api.performance.summary(),
        api.performance.byModel(),
        api.performance.pnlHistory(),
      ]);
      setSummary(s);
      setByModel(m);
      setPnlHistory(p);
    } catch {
      // silent fail, data shows as empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { summary, byModel, pnlHistory, loading, refresh };
}
