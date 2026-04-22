"use server";

import { getChartFieldOptions, savedChartTypes } from "@/services/chart-fields";

export async function getChartFieldsAction() {
  return {
    fields: getChartFieldOptions(),
    chartTypes: savedChartTypes,
  };
}
