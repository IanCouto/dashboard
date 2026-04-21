"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart } from "@tremor/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { utils, writeFileXLSX } from "xlsx";
import { Download } from "lucide-react";
import { getDashboardAggregationsAction } from "@/app/actions/get-dashboard-aggregations";
import { DashboardFilters, initialFilters } from "@/components/dashboard-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardFilters as DashboardFiltersType } from "@/services/filter-options";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const monthLabelByNumber: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Marco",
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

type SubtableSortColumn =
  | "promotor"
  | "coordenador"
  | "descricao_cliente"
  | "tipo_faturamento"
  | "ano"
  | "total";

type SubtableRow = {
  promotor: string;
  coordenador: string;
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
      case "promotor":
        cmp = a.promotor.localeCompare(b.promotor, "pt-BR");
        break;
      case "coordenador":
        cmp = a.coordenador.localeCompare(b.coordenador, "pt-BR");
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

function subtableRowKey(row: SubtableRow): string {
  return [row.promotor, row.coordenador, row.descricao_cliente, row.tipo_faturamento].join("|");
}

function subtableRowLabel(key: string): string {
  const parts = key.split("|");
  const promotor = parts[0] ?? "";
  const tipo = parts[3] ?? "";
  const truncate = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max)}…` : value;
  return `${truncate(tipo, 36)} · ${truncate(promotor, 18)}`;
}

export function DashboardOverview() {
  const [filters, setFilters] = useState<DashboardFiltersType>(initialFilters);
  const queryKey = useMemo(() => ["dashboard-aggregations", filters], [filters]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => getDashboardAggregationsAction(filters),
    placeholderData: (previousData) => previousData,
  });

  const barChartRef = useRef<HTMLDivElement | null>(null);
  const lineChartRef = useRef<HTMLDivElement | null>(null);
  const tipoBarChartRef = useRef<HTMLDivElement | null>(null);
  const [visibleCharts, setVisibleCharts] = useState<Array<"year" | "tipoBar" | "line">>(
    ["year", "tipoBar", "line"]
  );
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

  const chartYearCategories = useMemo(
    () =>
      [...selectedYearTables]
        .sort((a, b) => a.ano - b.ano)
        .map((table) => `Ano ${table.ano}`),
    [selectedYearTables]
  );

  const rowTotalsByLineChartData = useMemo(() => {
    const keys = new Set<string>();
    for (const table of selectedYearTables) {
      for (const row of table.rows as SubtableRow[]) {
        keys.add(subtableRowKey(row));
      }
    }
    return [...keys].map((key) => {
      const point: Record<string, string | number> = { linha: subtableRowLabel(key) };
      for (const table of selectedYearTables) {
        const match = (table.rows as SubtableRow[]).find((row) => subtableRowKey(row) === key);
        point[`Ano ${table.ano}`] = match?.total ?? 0;
      }
      return point;
    });
  }, [selectedYearTables]);

  const tipoTotalsByYearFromSubtables = useMemo(() => {
    const tipos = new Set<string>();
    for (const table of selectedYearTables) {
      for (const row of table.rows as SubtableRow[]) {
        tipos.add(row.tipo_faturamento);
      }
    }
    return [...tipos]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((tipo) => {
        const point: Record<string, string | number> = { tipo };
        for (const table of selectedYearTables) {
          const sum = (table.rows as SubtableRow[])
            .filter((row) => row.tipo_faturamento === tipo)
            .reduce((acc, row) => acc + row.total, 0);
          point[`Ano ${table.ano}`] = sum;
        }
        return point;
      });
  }, [selectedYearTables]);

  const monthlyTotalsByTableChartData = useMemo(() => {
    const rows: Array<Record<string, string | number>> = [];
    for (let mes = 1; mes <= 12; mes += 1) {
      const point: Record<string, string | number> = {
        mes: monthLabelByNumber[mes] ?? String(mes),
      };
      for (const table of selectedYearTables) {
        let sum = 0;
        for (const row of table.rows as SubtableRow[]) {
          const monthRow = row.monthlyBreakdown.find((item) => item.mes === mes);
          sum += monthRow?.total ?? 0;
        }
        point[`Ano ${table.ano}`] = sum;
      }
      rows.push(point);
    }
    return rows;
  }, [selectedYearTables]);

  const chartYearColors = useMemo(() => {
    const palette = ["blue", "cyan", "indigo", "violet", "amber", "emerald", "rose", "fuchsia"];
    return chartYearCategories.map((_, index) => palette[index % palette.length]);
  }, [chartYearCategories]);

  const exportChartAsPng1080p = useCallback(async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) {
      return;
    }

    const svg =
      ref.current.querySelector(".recharts-wrapper svg") ??
      ref.current.querySelector(".recharts-responsive-container svg") ??
      ref.current.querySelector("svg.recharts-surface");
    if (!svg) {
      throw new Error("Nao foi possivel localizar o SVG do grafico para exportacao.");
    }

    const sourceRect = svg.getBoundingClientRect();
    const serializer = new XMLSerializer();
    const svgMarkup = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.src = svgUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Falha ao gerar imagem a partir do componente SVG."));
    });

    const targetWidth = 1920;
    const targetHeight = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Nao foi possivel criar contexto de exportacao.");
    }

    context.fillStyle = "#18181b";
    context.fillRect(0, 0, targetWidth, targetHeight);

    const scale = Math.min(targetWidth / sourceRect.width, targetHeight / sourceRect.height);
    const drawWidth = sourceRect.width * scale;
    const drawHeight = sourceRect.height * scale;
    const x = (targetWidth - drawWidth) / 2;
    const y = (targetHeight - drawHeight) / 2;
    context.drawImage(image, x, y, drawWidth, drawHeight);

    URL.revokeObjectURL(svgUrl);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = fileName;
    link.click();
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
          promotor: row.promotor,
          coordenador: row.coordenador,
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

  const toggleChart = useCallback((chart: "year" | "tipoBar" | "line") => {
    setVisibleCharts((current) => {
      const exists = current.includes(chart);
      if (exists) {
        return current.filter((item) => item !== chart);
      }
      return [...current, chart];
    });
  }, []);

  return (
    <>
      <DashboardFilters filters={filters} onChange={setFilters} />

      <section className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "year" as const, label: "Por linha (por ano)" },
            { key: "tipoBar" as const, label: "Por tipo (por ano)" },
            { key: "line" as const, label: "Mensal (por ano)" },
          ].map((chart) => {
            const selected = visibleCharts.includes(chart.key);
            return (
              <Button
                key={chart.key}
                type="button"
                variant="outline"
                onClick={() => toggleChart(chart.key)}
                className={`rounded-xl border-zinc-700 transition ${
                  selected ? "bg-zinc-800 text-white" : "bg-zinc-900 text-zinc-400"
                }`}
              >
                {chart.label}
              </Button>
            );
          })}
        </div>
        {isFetching && !isLoading ? (
          <span className="text-xs text-zinc-500">Sincronizando visualizacao...</span>
        ) : null}
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
                          onClick={() => toggleSubtableSort(table.ano, "promotor")}
                        >
                          Promotor{sortIndicator("promotor")}
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
                        <td className="px-3 py-2">{row.promotor}</td>
                        <td className="px-3 py-2">{row.coordenador}</td>
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

      <section className="space-y-4">
        {visibleCharts.includes("year") ? (
          <Card
            ref={barChartRef}
            className="rounded-2xl border-zinc-800 bg-zinc-900 text-white shadow-sm"
          >
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Total por linha da subtabela (por ano)
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg p-0 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => exportChartAsPng1080p(barChartRef, "chart-total-por-linha-por-ano-1080p.png")}
                >
                  <Download className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full bg-zinc-800" />
              ) : chartYearCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Sem dados de subtabela para os anos selecionados.
                </p>
              ) : (
                <BarChart
                  className="h-96"
                  layout="vertical"
                  data={rowTotalsByLineChartData}
                  index="linha"
                  categories={chartYearCategories}
                  colors={chartYearColors}
                  valueFormatter={(value) => toCurrency(Number(value))}
                  yAxisWidth={220}
                />
              )}
            </CardContent>
          </Card>
        ) : null}

        {visibleCharts.includes("tipoBar") ? (
          <Card
            ref={tipoBarChartRef}
            className="rounded-2xl border-zinc-800 bg-zinc-900 text-white shadow-sm"
          >
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Total por tipo de faturamento nas subtabelas (por ano)
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg p-0 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => exportChartAsPng1080p(tipoBarChartRef, "chart-total-por-tipo-por-ano-1080p.png")}
                >
                  <Download className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full bg-zinc-800" />
              ) : chartYearCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Sem dados de subtabela para os anos selecionados.
                </p>
              ) : (
                <BarChart
                  className="h-96"
                  data={tipoTotalsByYearFromSubtables}
                  index="tipo"
                  categories={chartYearCategories}
                  colors={chartYearColors}
                  valueFormatter={(value) => toCurrency(Number(value))}
                  yAxisWidth={220}
                />
              )}
            </CardContent>
          </Card>
        ) : null}

        {visibleCharts.includes("line") ? (
          <Card
            ref={lineChartRef}
            className="rounded-2xl border-zinc-800 bg-zinc-900 text-white shadow-sm"
          >
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Soma mensal das linhas da subtabela (por ano)
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg p-0 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => exportChartAsPng1080p(lineChartRef, "chart-mensal-agregado-por-ano-1080p.png")}
                >
                  <Download className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72 w-full bg-zinc-800" />
              ) : chartYearCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Sem dados de subtabela para os anos selecionados.
                </p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={monthlyTotalsByTableChartData}
                      margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="mes"
                        interval={0}
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
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #3f3f46",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#e4e4e7" }}
                      />
                      {chartYearCategories.length > 1 ? (
                        <Legend wrapperStyle={{ color: "#d4d4d8", fontSize: 12 }} />
                      ) : null}
                      {chartYearCategories.map((category, index) => (
                        (() => {
                          const strokeColor =
                            ["#3b82f6", "#06b6d4", "#6366f1", "#a855f7", "#f59e0b", "#10b981"][
                              index % 6
                            ];
                          return (
                        <Line
                          key={category}
                          type="monotone"
                          dataKey={category}
                          stroke={strokeColor}
                          strokeWidth={3}
                          strokeOpacity={1}
                          fill="none"
                          legendType="line"
                          dot={{ r: 2, stroke: strokeColor, fill: strokeColor }}
                          activeDot={{ r: 5, stroke: strokeColor, fill: "#18181b", strokeWidth: 2 }}
                          connectNulls
                          isAnimationActive={false}
                        />
                          );
                        })()
                      ))}
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

      </section>
    </>
  );
}
