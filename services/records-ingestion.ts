import { prisma } from "@/lib/prisma";

const REQUIRED_COLUMNS = [
  "Região",
  "Promotor",
  "Tipo contrato",
  "Coordenador",
  "Código cliente",
  "Descrição cliente",
  "Tipo Faturamento",
  "Ano",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

const MONTH_COLUMNS: Array<{ name: string; mes: number }> = [
  { name: "Janeiro", mes: 1 },
  { name: "Fevereiro", mes: 2 },
  { name: "Março", mes: 3 },
  { name: "Abril", mes: 4 },
  { name: "Maio", mes: 5 },
  { name: "Junho", mes: 6 },
  { name: "Julho", mes: 7 },
  { name: "Agosto", mes: 8 },
  { name: "Setembro", mes: 9 },
  { name: "Outubro", mes: 10 },
  { name: "Novembro", mes: 11 },
  { name: "Dezembro", mes: 12 },
];

type HeaderMap = Map<string, string>;

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toNumberOrZero(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value).trim();
  if (!text) {
    return 0;
  }

  const withoutCurrency = text.replace(/[^\d,.\-]/g, "");
  if (!withoutCurrency || withoutCurrency === "-") {
    return 0;
  }

  let normalized = withoutCurrency;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    // Ex.: 1.234,56 -> 1234.56
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    const commaCount = (normalized.match(/,/g) ?? []).length;
    if (commaCount === 1) {
      const [left, right = ""] = normalized.split(",");
      // Treat comma as decimal only when it looks like decimal precision.
      normalized = right.length <= 2 ? `${left}.${right}` : `${left}${right}`;
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  }

  normalized = normalized.replace(/\s+/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toSafeString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function resolveHeaderMap(headers: string[]): HeaderMap {
  return new Map(headers.map((header) => [normalizeHeader(header), header]));
}

function getColumnName(headerMap: HeaderMap, requiredName: string): string {
  const column = headerMap.get(normalizeHeader(requiredName));
  if (!column) {
    throw new Error(`Coluna obrigatoria ausente: ${requiredName}`);
  }
  return column;
}

type InputRow = Record<string, unknown>;

export async function replaceRecordsFromRows(rows: InputRow[], headers: string[]) {
  const headerMap = resolveHeaderMap(headers);
  const regiaoColumn = getColumnName(headerMap, "Região");
  const promotorColumn = getColumnName(headerMap, "Promotor");
  const tipoContratoColumn = getColumnName(headerMap, "Tipo contrato");
  const coordenadorColumn = getColumnName(headerMap, "Coordenador");
  const codigoClienteColumn = getColumnName(headerMap, "Código cliente");
  const descricaoClienteColumn = getColumnName(headerMap, "Descrição cliente");
  const tipoFaturamentoColumn = getColumnName(headerMap, "Tipo Faturamento");
  const anoColumn = getColumnName(headerMap, "Ano");
  const monthColumns = MONTH_COLUMNS.map((month) => ({
    mes: month.mes,
    column: getColumnName(headerMap, month.name),
  }));

  const normalizedData = rows.flatMap((row) => {
    const ano = Math.trunc(toNumberOrZero(row[anoColumn]));

    if (!ano) {
      return [];
    }

    return monthColumns.map(({ mes, column }) => ({
      regiao: toSafeString(row[regiaoColumn]),
      promotor: toSafeString(row[promotorColumn]),
      tipo_contrato: toSafeString(row[tipoContratoColumn]),
      coordenador: toSafeString(row[coordenadorColumn]),
      codigo_cliente: toSafeString(row[codigoClienteColumn]),
      descricao_cliente: toSafeString(row[descricaoClienteColumn]),
      tipo_faturamento: toSafeString(row[tipoFaturamentoColumn]),
      ano,
      mes,
      valor: toNumberOrZero(row[column]),
    }));
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('TRUNCATE TABLE "records" RESTART IDENTITY');

    const batchSize = 1000;
    for (let index = 0; index < normalizedData.length; index += batchSize) {
      const batch = normalizedData.slice(index, index + batchSize);
      if (batch.length > 0) {
        await tx.record.createMany({ data: batch });
      }
    }
  });

  return {
    inputRows: rows.length,
    normalizedRows: normalizedData.length,
    requiredColumns: REQUIRED_COLUMNS.length,
  };
}

export { REQUIRED_COLUMNS };
