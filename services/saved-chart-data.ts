import { getDashboardAggregations } from "@/services/aggregations";
import type { DashboardFilters } from "@/services/filter-options";
import type { SavedChartDto } from "@/services/saved-charts";

export type SavedChartDataPoint = {
  label: string;
  value: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  if (typeof value === "object" && value && "toString" in value) {
    const numeric = Number((value as { toString: () => string }).toString());
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
}

type SubtableSourceRow = {
  regiao: string;
  promotor: string;
  tipo_contrato: string;
  coordenador: string;
  codigo_cliente: string;
  descricao_cliente: string;
  tipo_faturamento: string;
  ano: number;
  mes: number;
  total: number;
};

type ValueOperation =
  | "sum"
  | "count"
  | "average"
  | "max"
  | "min"
  | "product"
  | "countNumbers"
  | "stdDev"
  | "stdDevp"
  | "var"
  | "varp";

function getSourceValue(row: SubtableSourceRow, field: SavedChartDto["xField"] | SavedChartDto["yField"]) {
  return row[field as keyof SubtableSourceRow];
}

export async function getSavedChartData(
  chart: SavedChartDto,
  filters: DashboardFilters
): Promise<SavedChartDataPoint[]> {
  const aggregations = await getDashboardAggregations(filters);
  const sourceRows: SubtableSourceRow[] =
    chart.chartType === "line"
      ? aggregations.yearlyTables.flatMap((table) =>
          table.rows.flatMap((row) =>
            row.monthlyBreakdown.map((monthPoint) => ({
              regiao: row.regiao,
              promotor: row.promotor,
              tipo_contrato: row.tipo_contrato,
              coordenador: row.coordenador,
              codigo_cliente: row.codigo_cliente,
              descricao_cliente: row.descricao_cliente,
              tipo_faturamento: row.tipo_faturamento,
              ano: table.ano,
              mes: monthPoint.mes,
              total: toNumber(monthPoint.total),
            }))
          )
        )
      : aggregations.yearlyTables.flatMap((table) =>
          table.rows.map((row) => ({
            regiao: row.regiao,
            promotor: row.promotor,
            tipo_contrato: row.tipo_contrato,
            coordenador: row.coordenador,
            codigo_cliente: row.codigo_cliente,
            descricao_cliente: row.descricao_cliente,
            tipo_faturamento: row.tipo_faturamento,
            ano: table.ano,
            mes: 0,
            total: toNumber(row.total),
          }))
        );

  const filteredRows =
    chart.pivotConfig?.filterField && chart.pivotConfig?.filterValue
      ? sourceRows.filter((row) =>
          String(row[chart.pivotConfig!.filterField as keyof SubtableSourceRow])
            .toLowerCase()
            .includes(String(chart.pivotConfig!.filterValue).toLowerCase())
        )
      : sourceRows;

  const rowFields = chart.pivotConfig?.rowFields ?? [];
  const columnField: SavedChartDto["xField"] | "mes" =
    chart.chartType === "line" ? "mes" : (chart.pivotConfig?.columnField ?? chart.xField);
  const effectiveRowFields =
    chart.chartType === "line"
      ? rowFields
      : rowFields.filter((field) => field !== columnField);

  const rowsByX = filteredRows
    .slice()
    .sort((a, b) =>
      String(getSourceValue(a, columnField)).localeCompare(
        String(getSourceValue(b, columnField)),
        "pt-BR"
      )
    );

  const points = new Map<string, number>();
  const valueBuckets = new Map<string, number[]>();
  const rowLabelsSeen = new Set<string>();
  for (const row of rowsByX) {
    const rowLabel =
      chart.chartType === "line"
        ? (() => {
            const baseLabel =
              effectiveRowFields.length > 0
                ? effectiveRowFields.map((field) => String(row[field as keyof SubtableSourceRow])).join(" / ")
                : "Total";
            const alreadyIncludesTipo = effectiveRowFields.includes("tipo_faturamento");
            return alreadyIncludesTipo ? baseLabel : `${baseLabel} / ${row.tipo_faturamento}`;
          })()
        : effectiveRowFields.length > 0
          ? effectiveRowFields.map((field) => String(row[field as keyof SubtableSourceRow])).join(" / ")
          : "Total";
    rowLabelsSeen.add(rowLabel);
    const columnValue = String(getSourceValue(row, columnField));
    const yValue = toNumber(getSourceValue(row, chart.yField));
    const label = `${rowLabel} | ${columnValue}`;
    const current = valueBuckets.get(label) ?? [];
    current.push(yValue);
    valueBuckets.set(label, current);
  }

  const operation: ValueOperation = chart.pivotConfig?.valueOperation ?? "sum";

  const compute = (values: number[]) => {
    if (values.length === 0) return 0;
    if (operation === "sum") return values.reduce((acc, item) => acc + item, 0);
    if (operation === "count") return values.length;
    if (operation === "average") return values.reduce((acc, item) => acc + item, 0) / values.length;
    if (operation === "max") return Math.max(...values);
    if (operation === "min") return Math.min(...values);
    if (operation === "product") return values.reduce((acc, item) => acc * item, 1);
    if (operation === "countNumbers") return values.filter((item) => Number.isFinite(item)).length;
    if (operation === "stdDev" || operation === "stdDevp" || operation === "var" || operation === "varp") {
      const mean = values.reduce((acc, item) => acc + item, 0) / values.length;
      const squaredDiffSum = values.reduce((acc, item) => acc + (item - mean) ** 2, 0);
      const denominator =
        operation === "stdDev" || operation === "var"
          ? Math.max(values.length - 1, 1)
          : values.length;
      const variance = squaredDiffSum / denominator;
      if (operation === "var" || operation === "varp") {
        return variance;
      }
      return Math.sqrt(variance);
    }
    return values.reduce((acc, item) => acc + item, 0);
  };

  for (const [label, values] of valueBuckets.entries()) {
    points.set(label, compute(values));
  }

  return Array.from(points.entries()).map(([label, value]) => ({
    label,
    value: Number.isFinite(value) ? value : 0,
  }));
}
