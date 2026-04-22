"use server";

import { createSavedChart } from "@/services/saved-charts";

export async function createSavedChartAction(input: unknown) {
  return createSavedChart(input);
}
