"use server";

import { listSavedCharts } from "@/services/saved-charts";

export async function listSavedChartsAction() {
  return listSavedCharts();
}
