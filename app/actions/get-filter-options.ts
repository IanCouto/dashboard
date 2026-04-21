"use server";

import {
  type DashboardFilters,
  getFilterOptions,
} from "@/services/filter-options";

export async function getFilterOptionsAction(filters: DashboardFilters) {
  return getFilterOptions(filters);
}
