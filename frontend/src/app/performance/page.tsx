"use client";

import { usePerformance } from "@/hooks/usePerformance";
import { useModels } from "@/hooks/useModels";
import { StatCard } from "@/components/stat-card";
import { PnlChart } from "@/components/pnl-chart";
import { ModelAccuracyChart } from "@/components/model-accuracy-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card";
import { formatUsd, modelDisplayName } from "@/lib/utils";
import { Skeleton } from "@/components/skeleton";

export default function PerformancePage() {
  const { summary, byModel, pnlHistory, loading } = usePerformance();
  const { displayMap } = useModels();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Performance</h1>
        <p className="text-muted-foreground">
          Track prediction accuracy and P&L across all models
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Accuracy"
          value={`${summary?.accuracy_pct ?? 0}%`}
          subtitle={`${summary?.resolved_markets ?? 0} resolved markets`}
          loading={loading}
        />
        <StatCard
          title="Total P&L"
          value={formatUsd(summary?.total_pnl ?? 0)}
          subtitle="Hypothetical returns"
          loading={loading}
        />
        <StatCard
          title="Win Rate"
          value={`${summary?.win_rate ?? 0}%`}
          subtitle="Of markets with bets"
          loading={loading}
        />
        <StatCard
          title="Avg Confidence"
          value={`${((summary?.avg_confidence ?? 0) * 100).toFixed(1)}%`}
          subtitle="Across all consensus"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelAccuracyChart data={byModel} displayMap={displayMap} />
        <PnlChart data={pnlHistory} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : byModel.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No prediction data yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Model</th>
                    <th className="pb-3 font-medium text-muted-foreground">Predictions</th>
                    <th className="pb-3 font-medium text-muted-foreground">Correct</th>
                    <th className="pb-3 font-medium text-muted-foreground">Incorrect</th>
                    <th className="pb-3 font-medium text-muted-foreground">No Trade</th>
                    <th className="pb-3 font-medium text-muted-foreground">Accuracy</th>
                    <th className="pb-3 font-medium text-muted-foreground">Avg Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((model) => (
                    <tr key={model.model_name} className="border-b">
                      <td className="py-3 font-medium">
                        {modelDisplayName(model.model_name, displayMap)}
                      </td>
                      <td className="py-3">{model.total_predictions}</td>
                      <td className="py-3 text-green-600">{model.correct}</td>
                      <td className="py-3 text-red-600">{model.incorrect}</td>
                      <td className="py-3 text-yellow-600">{model.no_trade}</td>
                      <td className="py-3 font-medium">{model.accuracy_pct}%</td>
                      <td className="py-3">
                        {(model.avg_confidence * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
