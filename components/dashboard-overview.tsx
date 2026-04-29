"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar as RechartsBar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { utils, writeFileXLSX } from "xlsx";
import { ChevronDown, Download } from "lucide-react";
import { createSavedChartAction } from "@/app/actions/create-saved-chart";
import { deleteSavedChartAction } from "@/app/actions/delete-saved-chart";
import { getChartFieldsAction } from "@/app/actions/get-chart-fields";
import { getDashboardAggregationsAction } from "@/app/actions/get-dashboard-aggregations";
import { getSavedChartDataAction } from "@/app/actions/get-saved-chart-data";
import { listSavedChartsAction } from "@/app/actions/list-saved-charts";
import { updateSavedChartAction } from "@/app/actions/update-saved-chart";
import { DashboardFilters, initialFilters } from "@/components/dashboard-filters";
import {
  SavedChartForm,
  type SavedChartFormValues,
} from "@/components/saved-chart-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedChartType } from "@/services/chart-fields";
import type { DashboardFilters as DashboardFiltersType } from "@/services/filter-options";
import type { SavedChartDto } from "@/services/saved-charts";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const monthLabelByNumber: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

function toCurrency(value: number) {
  return currency.format(value);
}

function formValuesToPayload(values: SavedChartFormValues) {
  return {
    name: values.name,
    chartType: values.chartType as SavedChartType,
    xField: values.xField,
    yField: values.yField,
    pivotConfig: {
      rowFields: values.rowFields,
      columnField: values.xField,
      valueOperation: values.valueOperation,
      filterField: null,
      filterValue: null,
    },
    comparisonField: null,
    comparisonOperator: null,
    comparisonValue: null,
  };
}

type SubtableSortColumn =
  | "regiao"
  | "promotor"
  | "tipo_contrato"
  | "coordenador"
  | "codigo_cliente"
  | "descricao_cliente"
  | "tipo_faturamento"
  | "ano"
  | "total";

type SubtableRow = {
  regiao: string;
  promotor: string;
  tipo_contrato: string;
  coordenador: string;
  codigo_cliente: string;
  descricao_cliente: string;
  tipo_faturamento: string;
  total: number;
  monthlyBreakdown: { mes: number; total: number }[];
};

function sortSubtableRows(
  rows: SubtableRow[],
  ano: number,
  sort: { column: SubtableSortColumn; direction: "asc" | "desc" } | undefined
): SubtableRow[] {
  if (!sort) {
    return [...rows];
  }
  const dir = sort.direction === "asc" ? 1 : -1;
  const copy = [...rows];
  copy.sort((a, b) => {
    let cmp = 0;
    switch (sort.column) {
      case "regiao":
        cmp = a.regiao.localeCompare(b.regiao, "pt-BR");
        break;
      case "promotor":
        cmp = a.promotor.localeCompare(b.promotor, "pt-BR");
        break;
      case "tipo_contrato":
        cmp = a.tipo_contrato.localeCompare(b.tipo_contrato, "pt-BR");
        break;
      case "coordenador":
        cmp = a.coordenador.localeCompare(b.coordenador, "pt-BR");
        break;
      case "codigo_cliente":
        cmp = a.codigo_cliente.localeCompare(b.codigo_cliente, "pt-BR");
        break;
      case "descricao_cliente":
        cmp = a.descricao_cliente.localeCompare(b.descricao_cliente, "pt-BR");
        break;
      case "tipo_faturamento":
        cmp = a.tipo_faturamento.localeCompare(b.tipo_faturamento, "pt-BR");
        break;
      case "ano":
        cmp = ano - ano;
        break;
      case "total":
        cmp = a.total - b.total;
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) {
      cmp = a.promotor.localeCompare(b.promotor, "pt-BR") || a.tipo_faturamento.localeCompare(b.tipo_faturamento, "pt-BR");
    }
    return cmp * dir;
  });
  return copy;
}

export function DashboardOverview() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DashboardFiltersType>(initialFilters);
  const queryKey = useMemo(() => ["dashboard-aggregations", filters], [filters]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getDashboardAggregationsAction(filters),
    placeholderData: (previousData) => previousData,
  });
  const savedChartsQuery = useQuery({
    queryKey: ["saved-charts"],
    queryFn: listSavedChartsAction,
  });
  const chartFieldsQuery = useQuery({
    queryKey: ["chart-fields"],
    queryFn: getChartFieldsAction,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<SavedChartDto | null>(null);
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>([]);
  const [chartSearch, setChartSearch] = useState("");
  const [isSavedChartsOpen, setIsSavedChartsOpen] = useState(true);

  const chartsById = useMemo(
    () => new Map((savedChartsQuery.data ?? []).map((chart) => [chart.id, chart])),
    [savedChartsQuery.data]
  );

  const selectedCharts = useMemo(
    () =>
      selectedChartIds
        .map((id) => chartsById.get(id))
        .filter((chart): chart is SavedChartDto => Boolean(chart)),
    [chartsById, selectedChartIds]
  );

  const filteredCharts = useMemo(() => {
    const query = chartSearch.trim().toLowerCase();
    const all = savedChartsQuery.data ?? [];
    const matched = query
      ? all.filter((chart) => {
          const searchable = [
            chart.name,
            chart.chartType,
            chart.xField,
            chart.yField,
            ...(chart.pivotConfig?.rowFields ?? []),
          ]
            .join(" ")
            .toLowerCase();
          return searchable.includes(query);
        })
      : all;

    return [...matched].sort((a, b) => {
      const aSelected = selectedChartIds.includes(a.id);
      const bSelected = selectedChartIds.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [chartSearch, savedChartsQuery.data, selectedChartIds]);

  const selectedChartDataQueries = useQueries({
    queries: selectedCharts.map((chart) => ({
      queryKey: ["saved-chart-data", chart.id, chart.updatedAt, filters],
      queryFn: () => getSavedChartDataAction(chart, filters),
    })),
  });

  const createChartMutation = useMutation({
    mutationFn: createSavedChartAction,
    onSuccess: async (createdChart) => {
      await queryClient.invalidateQueries({ queryKey: ["saved-charts"] });
      setSelectedChartIds((current) =>
        current.includes(createdChart.id) ? current : [createdChart.id, ...current]
      );
      setEditingChart(null);
      setIsCreateModalOpen(false);
    },
  });

  const updateChartMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SavedChartFormValues }) =>
      updateSavedChartAction(id, formValuesToPayload(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-charts"] });
      setEditingChart(null);
    },
  });

  const deleteChartMutation = useMutation({
    mutationFn: deleteSavedChartAction,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["saved-charts"] });
      setSelectedChartIds((current) => current.filter((id) => id !== result.id));
      if (editingChart?.id === result.id) {
        setEditingChart(null);
      }
    },
  });

  const [hoveredRowDetails, setHoveredRowDetails] = useState<{
    ano: number;
    promotor: string;
    tipoFaturamento: string;
    monthlyBreakdown: { mes: number; total: number }[];
  } | null>(null);
  const [pinnedRowDetails, setPinnedRowDetails] = useState<{
    ano: number;
    promotor: string;
    tipoFaturamento: string;
    monthlyBreakdown: { mes: number; total: number }[];
  } | null>(null);
  const [subtableSortByYear, setSubtableSortByYear] = useState<
    Record<number, { column: SubtableSortColumn; direction: "asc" | "desc" }>
  >({});

  const selectedYearTables = (data?.yearlyTables ?? []).filter((table) =>
    filters.anos.length ? filters.anos.includes(table.ano) : true
  );

  const savedChartBarPalette = useMemo(
    () => [
      "#3b82f6",
      "#06b6d4",
      "#6366f1",
      "#a855f7",
      "#f59e0b",
      "#10b981",
      "#f43f5e",
      "#14b8a6",
    ],
    []
  );
  const tipoFaturamentoColorMap = useMemo(() => {
    const knownTipos = new Set<string>();
    for (const table of selectedYearTables) {
      for (const row of table.rows as SubtableRow[]) {
        knownTipos.add(row.tipo_faturamento);
      }
    }
    const map = new Map<string, string>();
    Array.from(knownTipos)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .forEach((tipo, index) => {
        map.set(tipo, savedChartBarPalette[index % savedChartBarPalette.length]);
      });
    return map;
  }, [savedChartBarPalette, selectedYearTables]);

  const resolveTipoFaturamentoColor = useCallback(
    (label: string, fallbackIndex: number) => {
      for (const [tipo, color] of tipoFaturamentoColorMap.entries()) {
        if (label.includes(tipo)) {
          return color;
        }
      }
      return savedChartBarPalette[fallbackIndex % savedChartBarPalette.length];
    },
    [savedChartBarPalette, tipoFaturamentoColorMap]
  );

  const getLineSeries = useCallback((chart: SavedChartDto, data: Array<{ label: string; value: number }>) => {
    if (chart.chartType !== "line") {
      return [] as string[];
    }
    const rows = new Set<string>();
    for (const point of data) {
      const [rowLabel] = point.label.split(" | ");
      if (rowLabel) {
        rows.add(rowLabel);
      }
    }
    return Array.from(rows.values());
  }, []);

  const getLineData = useCallback((chart: SavedChartDto, data: Array<{ label: string; value: number }>) => {
    if (chart.chartType !== "line") {
      return [] as Array<Record<string, string | number>>;
    }
    const byColumn = new Map<string, Record<string, string | number>>();
    for (const point of data) {
      const [rowLabel, columnLabel] = point.label.split(" | ");
      const column = columnLabel ?? "Sem coluna";
      const row = rowLabel ?? "Serie";
      const current = byColumn.get(column) ?? { coluna: column };
      current[row] = point.value;
      byColumn.set(column, current);
    }
    const normalized = Array.from(byColumn.values()).sort((a, b) =>
      Number(String(a.coluna)) - Number(String(b.coluna))
    );
    return normalized;
  }, []);


  const exportYearTableToExcel = useCallback(
    (year: number) => {
      const table = selectedYearTables.find((item) => item.ano === year);
      if (!table) {
        return;
      }

      const sortedRows = sortSubtableRows(
        table.rows as SubtableRow[],
        year,
        subtableSortByYear[year]
      );

      const tableSheet = utils.json_to_sheet(
        sortedRows.map((row) => ({
          regiao: row.regiao,
          promotor: row.promotor,
          tipo_contrato: row.tipo_contrato,
          coordenador: row.coordenador,
          codigo_cliente: row.codigo_cliente,
          descricao_cliente: row.descricao_cliente,
          tipo_faturamento: row.tipo_faturamento,
          ano: year,
          total: row.total,
        }))
      );

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, tableSheet, `Ano_${year}`);
      writeFileXLSX(workbook, `subtabela-${year}.xlsx`);
    },
    [selectedYearTables, subtableSortByYear]
  );

  const toggleSubtableSort = useCallback((ano: number, column: SubtableSortColumn) => {
    setSubtableSortByYear((previous) => {
      const current = previous[ano];
      if (current?.column === column) {
        return {
          ...previous,
          [ano]: { column, direction: current.direction === "asc" ? "desc" : "asc" },
        };
      }
      return { ...previous, [ano]: { column, direction: "asc" } };
    });
  }, []);

  const handleSaveChart = useCallback(
    (values: SavedChartFormValues) => {
      if (editingChart) {
        updateChartMutation.mutate({ id: editingChart.id, values });
        return;
      }
      createChartMutation.mutate(formValuesToPayload(values));
    },
    [createChartMutation, editingChart, updateChartMutation]
  );

  return (
    <>
      <DashboardFilters filters={filters} onChange={setFilters} />

      <section>
        <Card className="rounded-2xl border-zinc-800 bg-zinc-900 text-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsSavedChartsOpen((current) => !current)}
                className="flex items-center gap-2 text-left"
              >
                <CardTitle className="text-sm font-medium text-zinc-300">Graficos salvos</CardTitle>
                <ChevronDown
                  className={`size-4 text-zinc-500 transition-transform ${
                    isSavedChartsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <Button
                type="button"
                className="rounded-xl bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Novo grafico
              </Button>
            </div>
          </CardHeader>
          {isSavedChartsOpen ? (
            <CardContent className="space-y-2">
            <input
              value={chartSearch}
              onChange={(event) => setChartSearch(event.target.value)}
              placeholder="Buscar grafico salvo..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
            />
            {savedChartsQuery.isLoading ? (
              <Skeleton className="h-28 w-full bg-zinc-800" />
            ) : (savedChartsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhum grafico salvo. Crie um grafico para visualizar aqui.
              </p>
            ) : filteredCharts.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum grafico encontrado para a busca.</p>
            ) : (
              filteredCharts.map((chart) => {
                const isSelected = selectedChartIds.includes(chart.id);
                return (
                  <div
                    key={chart.id}
                    className={`rounded-xl border p-3 ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-zinc-800 bg-zinc-950/60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedChartIds((current) =>
                            isSelected
                              ? current.filter((id) => id !== chart.id)
                              : [chart.id, ...current]
                          )
                        }
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-100">{chart.name}</p>
                      <p className="text-xs text-zinc-500">
                        {chart.chartType.toUpperCase()} · X: {chart.xField} · Y: {chart.yField}
                      </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 rounded-lg border-zinc-700 px-2 text-xs text-zinc-200"
                        onClick={() => setEditingChart(chart)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 rounded-lg border-zinc-700 px-2 text-xs text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Deseja excluir o grafico "${chart.name}"?`
                          );
                          if (confirmed) {
                            deleteChartMutation.mutate(chart.id);
                          }
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            </CardContent>
          ) : null}
        </Card>
      </section>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            {chartFieldsQuery.isLoading ? (
              <Skeleton className="h-64 w-full bg-zinc-800" />
            ) : (
              <SavedChartForm
                key="create-modal"
                fields={chartFieldsQuery.data?.fields ?? []}
                chartTypes={chartFieldsQuery.data?.chartTypes ?? ["bar", "column", "line"]}
                isSubmitting={createChartMutation.isPending}
                onSubmit={handleSaveChart}
                onCancelEdit={() => setIsCreateModalOpen(false)}
              />
            )}
          </div>
        </div>
      ) : null}

      {editingChart ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            {chartFieldsQuery.isLoading ? (
              <Skeleton className="h-64 w-full bg-zinc-800" />
            ) : (
              <SavedChartForm
                key={editingChart.id}
                fields={chartFieldsQuery.data?.fields ?? []}
                chartTypes={chartFieldsQuery.data?.chartTypes ?? ["bar", "column", "line"]}
                initialValue={editingChart}
                isSubmitting={updateChartMutation.isPending}
                onSubmit={handleSaveChart}
                onCancelEdit={() => setEditingChart(null)}
              />
            )}
          </div>
        </div>
      ) : null}

      <section className="space-y-4">
        {selectedCharts.length === 0 ? (
          <Card className="rounded-2xl border-zinc-800 bg-zinc-900 text-white shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-zinc-400">Visualizacao de graficos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="py-8 text-center text-sm text-zinc-500">
                Selecione um ou mais graficos salvos para visualizar.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {selectedCharts.map((chart, chartIndex) => {
          const chartQuery = selectedChartDataQueries[chartIndex];
          const chartData = chartQuery?.data ?? [];
          const lineSeries = getLineSeries(chart, chartData);
          const lineData = getLineData(chart, chartData);

          return (
      <Card key={chart.id} className="rounded-2xl border-zinc-800 bg-zinc-900 text-white shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-zinc-400">
            {`Visualizacao: ${chart.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartQuery?.isLoading ? (
            <Skeleton className="h-72 w-full bg-zinc-800" />
          ) : chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Sem dados para o grafico selecionado.
            </p>
          ) : chart.chartType === "bar" ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={chartData.map((item) => ({
                    label: item.label,
                    valor: item.value,
                  }))}
                  layout="vertical"
                  margin={{ top: 12, right: 20, left: 20, bottom: 12 }}
                >
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => toCurrency(Number(value))}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={{ stroke: "#3f3f46" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={240}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={{ stroke: "#3f3f46" }}
                  />
                  <Tooltip
                    formatter={(value: number) => toCurrency(Number(value))}
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#e4e4e7" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <RechartsBar dataKey="valor" radius={[0, 6, 6, 0]} activeBar={false}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`${entry.label}-${index}`}
                        fill={resolveTipoFaturamentoColor(entry.label, index)}
                      />
                    ))}
                  </RechartsBar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : chart.chartType === "column" ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={chartData.map((item) => ({
                    label: item.label,
                    valor: item.value,
                  }))}
                  margin={{ top: 12, right: 20, left: 8, bottom: 12 }}
                >
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={{ stroke: "#3f3f46" }}
                  />
                  <YAxis
                    tickFormatter={(value) => toCurrency(Number(value))}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    width={170}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={{ stroke: "#3f3f46" }}
                  />
                  <Tooltip
                    formatter={(value: number) => toCurrency(Number(value))}
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#e4e4e7" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <RechartsBar dataKey="valor" radius={[6, 6, 0, 0]} activeBar={false}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`${entry.label}-${index}`}
                        fill={resolveTipoFaturamentoColor(entry.label, index)}
                      />
                    ))}
                  </RechartsBar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={lineData}>
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="coluna"
                    tickFormatter={(value) => monthLabelByNumber[Number(value)] ?? String(value)}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={{ stroke: "#3f3f46" }}
                  />
                  <YAxis
                    tickFormatter={(value) => toCurrency(Number(value))}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    width={170}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={{ stroke: "#3f3f46" }}
                  />
                  <Tooltip
                    formatter={(value: number) => toCurrency(Number(value))}
                    labelFormatter={(value) => monthLabelByNumber[Number(value)] ?? String(value)}
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#e4e4e7" }}
                  />
                  {lineSeries.length > 1 ? (
                    <Legend wrapperStyle={{ color: "#d4d4d8", fontSize: 12 }} />
                  ) : null}
                  {lineSeries.map((series, index) => {
                    const strokeColor = resolveTipoFaturamentoColor(series, index);
                    return (
                      <Line
                        key={series}
                        type="monotone"
                        dataKey={series}
                        stroke={strokeColor}
                        strokeWidth={3}
                        fill="none"
                        dot={{ r: 2, stroke: strokeColor, fill: strokeColor }}
                        activeDot={{ r: 5, stroke: strokeColor, fill: "#18181b", strokeWidth: 2 }}
                        isAnimationActive={false}
                        connectNulls
                      />
                    );
                  })}
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        {selectedYearTables.map((table) => {
          const sortState = subtableSortByYear[table.ano];
          const sortedRows = sortSubtableRows(table.rows as SubtableRow[], table.ano, sortState);

          const sortIndicator = (column: SubtableSortColumn) => {
            if (sortState?.column !== column) {
              return null;
            }
            return sortState.direction === "asc" ? " ↑" : " ↓";
          };

          return (
          <div
            key={table.ano}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm"
          >
            <details className="group" open={false}>
              <summary className="mb-3 flex cursor-pointer list-none items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
                <span>Tabela do ano {table.ano}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 rounded-lg px-2 text-zinc-300 hover:bg-zinc-800"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      exportYearTableToExcel(table.ano);
                    }}
                  >
                    <Download className="size-4" />
                  </Button>
                  <span className="text-xs text-zinc-500">{table.rows.length} linhas</span>
                </div>
              </summary>
              <div className="max-h-[280px] overflow-auto rounded-xl border border-zinc-800">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-zinc-950">
                    <tr className="border-b border-zinc-800 text-left text-zinc-400">
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "regiao")}
                        >
                          Regiao{sortIndicator("regiao")}
                        </button>
                      </th>
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "promotor")}
                        >
                          Promotor{sortIndicator("promotor")}
                        </button>
                      </th>
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "tipo_contrato")}
                        >
                          Tipo contrato{sortIndicator("tipo_contrato")}
                        </button>
                      </th>
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "coordenador")}
                        >
                          Coordenador{sortIndicator("coordenador")}
                        </button>
                      </th>
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "codigo_cliente")}
                        >
                          Codigo cliente{sortIndicator("codigo_cliente")}
                        </button>
                      </th>
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "descricao_cliente")}
                        >
                          Descricao cliente{sortIndicator("descricao_cliente")}
                        </button>
                      </th>
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "tipo_faturamento")}
                        >
                          Tipo Faturamento{sortIndicator("tipo_faturamento")}
                        </button>
                      </th>
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "ano")}
                        >
                          Ano{sortIndicator("ano")}
                        </button>
                      </th>
                      <th className="px-1 py-2">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => toggleSubtableSort(table.ano, "total")}
                        >
                          Total{sortIndicator("total")}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, index) => (
                      <tr
                        key={`${table.ano}-${row.promotor}-${row.tipo_faturamento}-${index}`}
                        onMouseEnter={() =>
                          setHoveredRowDetails({
                            ano: table.ano,
                            promotor: row.promotor,
                            tipoFaturamento: row.tipo_faturamento,
                            monthlyBreakdown: row.monthlyBreakdown,
                          })
                        }
                        onMouseLeave={() => {
                          if (!pinnedRowDetails) {
                            setHoveredRowDetails(null);
                          }
                        }}
                        onClick={() => {
                          const nextDetails = {
                            ano: table.ano,
                            promotor: row.promotor,
                            tipoFaturamento: row.tipo_faturamento,
                            monthlyBreakdown: row.monthlyBreakdown,
                          };

                          const isSamePinned =
                            pinnedRowDetails?.ano === nextDetails.ano &&
                            pinnedRowDetails.promotor === nextDetails.promotor &&
                            pinnedRowDetails.tipoFaturamento === nextDetails.tipoFaturamento;

                          if (isSamePinned) {
                            setPinnedRowDetails(null);
                          } else {
                            setPinnedRowDetails(nextDetails);
                          }
                        }}
                        className={`border-b border-zinc-800/60 ${
                          index % 2 === 0 ? "bg-zinc-900" : "bg-zinc-950/40"
                        } cursor-pointer hover:bg-zinc-800/60`}
                      >
                        <td className="px-3 py-2">{row.regiao}</td>
                        <td className="px-3 py-2">{row.promotor}</td>
                        <td className="px-3 py-2">{row.tipo_contrato}</td>
                        <td className="px-3 py-2">{row.coordenador}</td>
                        <td className="px-3 py-2">{row.codigo_cliente}</td>
                        <td className="px-3 py-2">{row.descricao_cliente}</td>
                        <td className="px-3 py-2">{row.tipo_faturamento}</td>
                        <td className="px-3 py-2">{table.ano}</td>
                        <td className="px-3 py-2">{toCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(pinnedRowDetails ?? hoveredRowDetails) &&
              (pinnedRowDetails ?? hoveredRowDetails)?.ano === table.ano ? (
                <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-xs font-medium text-zinc-300">
                    Detalhe mensal - {(pinnedRowDetails ?? hoveredRowDetails)?.promotor} /{" "}
                    {(pinnedRowDetails ?? hoveredRowDetails)?.tipoFaturamento}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-3">
                    {(pinnedRowDetails ?? hoveredRowDetails)?.monthlyBreakdown
                      .slice()
                      .sort((a, b) => a.mes - b.mes)
                      .map((item) => (
                        <div
                          key={`${(pinnedRowDetails ?? hoveredRowDetails)?.ano}-${(pinnedRowDetails ?? hoveredRowDetails)?.promotor}-${item.mes}`}
                          className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1"
                        >
                          <span className="text-zinc-500">
                            {monthLabelByNumber[item.mes] ?? item.mes}:
                          </span>{" "}
                          <span className="text-zinc-200">{toCurrency(item.total)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </details>
          </div>
          );
        })}
        {!isLoading && selectedYearTables.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500">
            Nenhuma tabela encontrada para os anos selecionados.
          </div>
        ) : null}
      </section>
    </>
  );
}
