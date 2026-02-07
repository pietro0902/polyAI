"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { LlmModel } from "@/lib/types";

export function useModels() {
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setModels(await api.models.list());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Map of name → display_name, e.g. { "gpt-4": "GPT-4o" } */
  const displayMap = useMemo(
    () => Object.fromEntries(models.map((m) => [m.name, m.display_name])),
    [models],
  );

  return { models, displayMap, loading, refresh };
}
