"use server";

import { deleteSavedChart } from "@/services/saved-charts";

export async function deleteSavedChartAction(id: string) {
  return deleteSavedChart(id);
}
