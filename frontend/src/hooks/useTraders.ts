"use client";

import { useCallback } from "react";
import { useRealtimeTable } from "./useRealtimeTable";
import { api } from "@/lib/api";
import type { TrackedTrader } from "@/lib/types";

export function useTrackedTraders() {
  const fetcher = useCallback(() => api.traders.tracked(), []);
  return useRealtimeTable<TrackedTrader>("tracked_traders", fetcher);
}
