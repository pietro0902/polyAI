"use client";

import { useCallback } from "react";
import { useRealtimeTable } from "./useRealtimeTable";
import { api } from "@/lib/api";
import type { Market } from "@/lib/types";

export function useMarkets(status?: string) {
  const fetcher = useCallback(
    () => api.markets.list({ status }),
    [status]
  );
  return useRealtimeTable<Market>("markets", fetcher);
}
