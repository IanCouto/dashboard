"use server";

import type { DashboardFilters } from "@/services/filter-options";
import { getDashboardAggregations } from "@/services/aggregations";

export async function getDashboardAggregationsAction(filters: DashboardFilters) {
  return getDashboardAggregations(filters);
}
