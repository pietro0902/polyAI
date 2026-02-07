"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function useRealtimeTable<T extends { id: string }>(
  table: string,
  initialFetcher: () => Promise<T[]>
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await initialFetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [initialFetcher]);

  useEffect(() => {
    refresh();

    if (!supabase) return;

    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: RealtimePostgresChangesPayload<T>) => {
          setData((prev) => {
            const newRecord = payload.new as T;
            const oldRecord = payload.old as Partial<T>;

            switch (payload.eventType) {
              case "INSERT":
                return [newRecord, ...prev];
              case "UPDATE":
                return prev.map((item) =>
                  item.id === newRecord.id ? newRecord : item
                );
              case "DELETE":
                return prev.filter((item) => item.id !== oldRecord.id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, refresh]);

  return { data, loading, error, refresh };
}
