import { prisma } from "@/lib/prisma";

export type DashboardFilters = {
  promotores: string[];
  coordenadores: string[];
  clientes: string[];
  tiposFaturamento: string[];
  anos: number[];
  meses: number[];
};

export type FilterOptions = {
  promotores: string[];
  coordenadores: string[];
  clientes: string[];
  tiposFaturamento: string[];
  anos: number[];
  meses: number[];
};

export function buildRecordWhere(
  filters: DashboardFilters,
  omitKeys: Array<keyof DashboardFilters> = []
) {
  const shouldOmit = (key: keyof DashboardFilters) => omitKeys.includes(key);

  return {
    promotor:
      !shouldOmit("promotores") && filters.promotores.length
        ? { in: filters.promotores }
        : undefined,
    coordenador:
      !shouldOmit("coordenadores") && filters.coordenadores.length
        ? { in: filters.coordenadores }
        : undefined,
    descricao_cliente:
      !shouldOmit("clientes") && filters.clientes.length ? { in: filters.clientes } : undefined,
    tipo_faturamento:
      !shouldOmit("tiposFaturamento") && filters.tiposFaturamento.length
      ? { in: filters.tiposFaturamento }
      : undefined,
    ano: !shouldOmit("anos") && filters.anos.length ? { in: filters.anos } : undefined,
    mes: !shouldOmit("meses") && filters.meses.length ? { in: filters.meses } : undefined,
  };
}

export async function getFilterOptions(filters: DashboardFilters): Promise<FilterOptions> {
  const whereForPromotores = buildRecordWhere(filters, ["promotores"]);
  const whereForCoordenadores = buildRecordWhere(filters, ["coordenadores"]);
  const whereForClientes = buildRecordWhere(filters, ["clientes"]);
  const whereForTiposFaturamento = buildRecordWhere(filters, ["tiposFaturamento"]);
  const whereForYears = buildRecordWhere(filters, ["anos"]);
  const whereForMonths = buildRecordWhere(filters, ["meses"]);

  const [promotoresRows, coordenadoresRows, clientesRows, tiposRows, anosRows, mesesRows] =
    await Promise.all([
      prisma.record.findMany({
        where: whereForPromotores,
        select: { promotor: true },
        distinct: ["promotor"],
      }),
      prisma.record.findMany({
        where: whereForCoordenadores,
        select: { coordenador: true },
        distinct: ["coordenador"],
      }),
      prisma.record.findMany({
        where: whereForClientes,
        select: { descricao_cliente: true },
        distinct: ["descricao_cliente"],
      }),
      prisma.record.findMany({
        where: whereForTiposFaturamento,
        select: { tipo_faturamento: true },
        distinct: ["tipo_faturamento"],
      }),
      prisma.record.findMany({ where: whereForYears, select: { ano: true }, distinct: ["ano"] }),
      prisma.record.findMany({ where: whereForMonths, select: { mes: true }, distinct: ["mes"] }),
    ]);

  return {
    promotores: promotoresRows.map((row) => row.promotor).sort((a, b) => a.localeCompare(b)),
    coordenadores: coordenadoresRows
      .map((row) => row.coordenador)
      .sort((a, b) => a.localeCompare(b)),
    clientes: clientesRows
      .map((row) => row.descricao_cliente)
      .sort((a, b) => a.localeCompare(b)),
    tiposFaturamento: tiposRows
      .map((row) => row.tipo_faturamento)
      .sort((a, b) => a.localeCompare(b)),
    anos: anosRows.map((row) => row.ano).sort((a, b) => a - b),
    meses: mesesRows.map((row) => row.mes).sort((a, b) => a - b),
  };
}
