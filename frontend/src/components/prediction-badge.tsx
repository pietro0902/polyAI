"use client";

import { Badge } from "./badge";

interface PredictionBadgeProps {
  prediction: "YES" | "NO" | "NO_TRADE";
  confidence?: number;
}

export function PredictionBadge({ prediction, confidence }: PredictionBadgeProps) {
  const variant =
    prediction === "YES"
      ? "success"
      : prediction === "NO"
        ? "destructive"
        : "warning";

  return (
    <Badge variant={variant}>
      {prediction}
      {confidence !== undefined && ` (${(confidence * 100).toFixed(0)}%)`}
    </Badge>
  );
}
