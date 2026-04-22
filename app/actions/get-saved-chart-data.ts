"use server";

import { getSavedChartData } from "@/services/saved-chart-data";
import type { DashboardFilters } from "@/services/filter-options";
import { validateSavedChartInput } from "@/services/saved-charts";

type SavedChartInputForData = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
} & Parameters<typeof validateSavedChartInput>[0];

export async function getSavedChartDataAction(input: SavedChartInputForData, filters: DashboardFilters) {
  const validated = validateSavedChartInput(input);
  return getSavedChartData({
    id: input.id ?? "draft",
    createdAt: input.createdAt ?? new Date(0).toISOString(),
    updatedAt: input.updatedAt ?? new Date(0).toISOString(),
    name: validated.name,
    chartType: validated.chartType,
    xField: validated.xField,
    yField: validated.yField,
    pivotConfig: validated.pivotConfig ?? null,
    comparisonField: validated.comparisonField ?? null,
    comparisonOperator: validated.comparisonOperator ?? null,
    comparisonValue: validated.comparisonValue ?? null,
  }, filters);
}
