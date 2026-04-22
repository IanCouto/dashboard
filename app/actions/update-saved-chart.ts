"use server";

import { updateSavedChart } from "@/services/saved-charts";

export async function updateSavedChartAction(id: string, input: unknown) {
  return updateSavedChart(id, input);
}
