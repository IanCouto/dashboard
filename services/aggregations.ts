import { prisma } from "@/lib/prisma";
import { buildRecordWhere, type DashboardFilters } from "@/services/filter-options";

export type YearTotal = {
  ano: number;
  total: number;
};

export type TipoFaturamentoTotal = {
  tipo_faturamento: string;
  total: number;
};

export type MonthlyTotal = {
  ano: number;
  mes: number;
  total: number;
};

export type DashboardAggregations = {
  totalsByYear: YearTotal[];
  totalsByTipoFaturamento: TipoFaturamentoTotal[];
  monthlyTotals: MonthlyTotal[];
  yearlyTables: {
    ano: number;
    rows: {
      promotor: string;
      coordenador: string;
      descricao_cliente: string;
      tipo_faturamento: string;
      total: number;
      monthlyBreakdown: { mes: number; total: number }[];
    }[];
  }[];
};

export async function getDashboardAggregations(
  filters: DashboardFilters
): Promise<DashboardAggregations> {
  const where = buildRecordWhere(filters);

  const [totalsByYearRaw, totalsByTipoRaw, monthlyTotalsRaw, tableRowsRaw, tableRowsMonthlyRaw] =
    await Promise.all([
    prisma.record.groupBy({
      by: ["ano"],
      where,
      _sum: { valor: true },
      orderBy: { ano: "asc" },
    }),
    prisma.record.groupBy({
      by: ["tipo_faturamento"],
      where,
      _sum: { valor: true },
      orderBy: { tipo_faturamento: "asc" },
    }),
    prisma.record.groupBy({
      by: ["ano", "mes"],
      where,
      _sum: { valor: true },
      orderBy: [{ ano: "asc" }, { mes: "asc" }],
    }),
    prisma.record.groupBy({
      by: [
        "ano",
        "promotor",
        "coordenador",
        "descricao_cliente",
        "tipo_faturamento",
      ],
      where,
      _sum: { valor: true },
      orderBy: [{ ano: "asc" }, { promotor: "asc" }, { descricao_cliente: "asc" }],
    }),
    prisma.record.groupBy({
      by: [
        "ano",
        "promotor",
        "coordenador",
        "descricao_cliente",
        "tipo_faturamento",
        "mes",
      ],
      where,
      _sum: { valor: true },
      orderBy: [{ ano: "asc" }, { mes: "asc" }],
    }),
  ]);

  const monthlyByRowKey = new Map<string, { mes: number; total: number }[]>();
  const buildRowKey = (
    ano: number,
    promotor: string,
    coordenador: string,
    descricao_cliente: string,
    tipo_faturamento: string
  ) => [ano, promotor, coordenador, descricao_cliente, tipo_faturamento].join("||");

  for (const row of tableRowsMonthlyRaw) {
    const key = buildRowKey(
      row.ano,
      row.promotor,
      row.coordenador,
      row.descricao_cliente,
      row.tipo_faturamento
    );
    const current = monthlyByRowKey.get(key) ?? [];
    current.push({
      mes: row.mes,
      total: Number(row._sum.valor ?? 0),
    });
    monthlyByRowKey.set(key, current);
  }

  const tableMap = new Map<
    number,
    {
      promotor: string;
      coordenador: string;
      descricao_cliente: string;
      tipo_faturamento: string;
      total: number;
    }[]
  >();

  for (const row of tableRowsRaw) {
    const current = tableMap.get(row.ano) ?? [];
    const key = buildRowKey(
      row.ano,
      row.promotor,
      row.coordenador,
      row.descricao_cliente,
      row.tipo_faturamento
    );
    current.push({
      promotor: row.promotor,
      coordenador: row.coordenador,
      descricao_cliente: row.descricao_cliente,
      tipo_faturamento: row.tipo_faturamento,
      total: Number(row._sum.valor ?? 0),
      monthlyBreakdown: monthlyByRowKey.get(key) ?? [],
    });
    tableMap.set(row.ano, current);
  }

  return {
    totalsByYear: totalsByYearRaw.map((row) => ({
      ano: row.ano,
      total: Number(row._sum.valor ?? 0),
    })),
    totalsByTipoFaturamento: totalsByTipoRaw.map((row) => ({
      tipo_faturamento: row.tipo_faturamento,
      total: Number(row._sum.valor ?? 0),
    })),
    monthlyTotals: monthlyTotalsRaw.map((row) => ({
      ano: row.ano,
      mes: row.mes,
      total: Number(row._sum.valor ?? 0),
    })),
    yearlyTables: Array.from(tableMap.entries()).map(([ano, rows]) => ({
      ano,
      rows,
    })),
  };
}
