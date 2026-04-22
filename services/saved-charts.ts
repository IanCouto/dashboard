import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  getRecordFieldType,
  isRecordFieldKey,
  savedChartTypes,
  type RecordFieldKey,
  type SavedChartOperator,
  type SavedChartType,
} from "@/services/chart-fields";

type SavedChartInput = {
  name: string;
  chartType: SavedChartType;
  xField: RecordFieldKey;
  yField: RecordFieldKey;
  pivotConfig?: {
    rowFields: RecordFieldKey[];
    columnField: RecordFieldKey;
    valueOperation:
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
    filterField: RecordFieldKey | null;
    filterValue: string | null;
  };
  comparisonField?: RecordFieldKey | null;
  comparisonOperator?: SavedChartOperator | null;
  comparisonValue?: string | number | Array<string | number> | null;
};

export type SavedChartDto = {
  id: string;
  name: string;
  chartType: SavedChartType;
  xField: RecordFieldKey;
  yField: RecordFieldKey;
  pivotConfig: {
    rowFields: RecordFieldKey[];
    columnField: RecordFieldKey;
    valueOperation:
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
    filterField: RecordFieldKey | null;
    filterValue: string | null;
  } | null;
  comparisonField: RecordFieldKey | null;
  comparisonOperator: SavedChartOperator | null;
  comparisonValue: string | number | Array<string | number> | null;
  createdAt: string;
  updatedAt: string;
};

function toSavedChartDto(chart: {
  id: string;
  name: string;
  chartType: string;
  xField: string;
  yField: string;
  comparisonField: string | null;
  comparisonOperator: string | null;
  comparisonValue: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SavedChartDto {
  const maybePivotConfig =
    chart.comparisonValue &&
    typeof chart.comparisonValue === "object" &&
    !Array.isArray(chart.comparisonValue) &&
    "rowFields" in (chart.comparisonValue as Record<string, unknown>) &&
    "columnField" in (chart.comparisonValue as Record<string, unknown>)
      ? ({
          ...(chart.comparisonValue as Record<string, unknown>),
          valueOperation:
            (chart.comparisonValue as Record<string, unknown>).valueOperation ?? "sum",
        } as SavedChartDto["pivotConfig"])
      : null;

  return {
    id: chart.id,
    name: chart.name,
    chartType: chart.chartType as SavedChartType,
    xField: chart.xField as RecordFieldKey,
    yField: chart.yField as RecordFieldKey,
    pivotConfig: maybePivotConfig,
    comparisonField: chart.comparisonField as RecordFieldKey | null,
    comparisonOperator: chart.comparisonOperator as SavedChartOperator | null,
    comparisonValue: (chart.comparisonValue ?? null) as SavedChartDto["comparisonValue"],
    createdAt: chart.createdAt.toISOString(),
    updatedAt: chart.updatedAt.toISOString(),
  };
}

function parseComparisonValue(rawValue: unknown): SavedChartInput["comparisonValue"] {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => {
        if (typeof item === "number") {
          return item;
        }
        if (typeof item === "string") {
          return item.trim();
        }
        throw new Error("Valor de comparacao invalido.");
      })
      .filter((item) => item !== "");
  }
  if (typeof rawValue === "number") {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
    const numeric = Number(trimmed.replace(",", "."));
    return Number.isFinite(numeric) && trimmed.match(/^-?\d+([.,]\d+)?$/) ? numeric : trimmed;
  }
  throw new Error("Valor de comparacao invalido.");
}

export function validateSavedChartInput(input: unknown): SavedChartInput {
  if (!input || typeof input !== "object") {
    throw new Error("Dados do grafico invalidos.");
  }
  const payload = input as Record<string, unknown>;
  const name = String(payload.name ?? "").trim();
  if (!name) {
    throw new Error("O nome do grafico e obrigatorio.");
  }
  if (name.length > 100) {
    throw new Error("O nome do grafico deve ter no maximo 100 caracteres.");
  }

  const chartType = String(payload.chartType ?? "") as SavedChartType;
  if (!savedChartTypes.includes(chartType)) {
    throw new Error("Tipo de grafico invalido.");
  }

  const xField = String(payload.xField ?? "");
  const yField = String(payload.yField ?? "");
  if (!isRecordFieldKey(xField) || !isRecordFieldKey(yField)) {
    throw new Error("Campos selecionados invalidos.");
  }
  if (getRecordFieldType(yField) !== "number") {
    throw new Error("O eixo Y precisa ser um campo numerico.");
  }

  let pivotConfig: SavedChartInput["pivotConfig"] = undefined;
  const pivotConfigRaw = payload.pivotConfig;
  if (pivotConfigRaw && typeof pivotConfigRaw === "object") {
    const pivot = pivotConfigRaw as Record<string, unknown>;
    const rowFields = Array.isArray(pivot.rowFields)
      ? pivot.rowFields
          .map((field) => String(field))
          .filter((field): field is RecordFieldKey => isRecordFieldKey(field))
      : [];
    const columnFieldRaw = String(pivot.columnField ?? xField);
    const filterFieldRaw = pivot.filterField ? String(pivot.filterField) : "";
    const filterValueRaw = pivot.filterValue ? String(pivot.filterValue) : "";
    const valueOperationRaw = String(pivot.valueOperation ?? "sum");
    const allowedOperations = new Set([
      "sum",
      "count",
      "average",
      "max",
      "min",
      "product",
      "countNumbers",
      "stdDev",
      "stdDevp",
      "var",
      "varp",
    ]);
    if (!isRecordFieldKey(columnFieldRaw)) {
      throw new Error("Campo de coluna invalido na configuracao da tabela dinamica.");
    }
    const filterField = filterFieldRaw && isRecordFieldKey(filterFieldRaw) ? filterFieldRaw : null;
    pivotConfig = {
      rowFields,
      columnField: columnFieldRaw,
      valueOperation: allowedOperations.has(valueOperationRaw)
        ? (valueOperationRaw as NonNullable<SavedChartInput["pivotConfig"]>["valueOperation"])
        : "sum",
      filterField,
      filterValue: filterValueRaw.trim() || null,
    };
  }

  const comparisonFieldRaw = payload.comparisonField;
  const comparisonOperatorRaw = payload.comparisonOperator;
  const comparisonValueRaw = payload.comparisonValue;

  let comparisonField: RecordFieldKey | null = null;
  let comparisonOperator: SavedChartOperator | null = null;
  let comparisonValue: SavedChartInput["comparisonValue"] = null;

  if (comparisonFieldRaw !== undefined && comparisonFieldRaw !== null && String(comparisonFieldRaw).trim() !== "") {
    const parsedComparisonField = String(comparisonFieldRaw);
    if (!isRecordFieldKey(parsedComparisonField)) {
      throw new Error("Campo de comparacao invalido.");
    }
    comparisonField = parsedComparisonField;
  }

  if (comparisonOperatorRaw !== undefined && comparisonOperatorRaw !== null && String(comparisonOperatorRaw).trim() !== "") {
    comparisonOperator = String(comparisonOperatorRaw) as SavedChartOperator;
  }

  const shouldParseComparisonValue =
    comparisonValueRaw !== undefined &&
    comparisonValueRaw !== null &&
    (typeof comparisonValueRaw === "string" ||
      typeof comparisonValueRaw === "number" ||
      Array.isArray(comparisonValueRaw));

  if (shouldParseComparisonValue) {
    comparisonValue = parseComparisonValue(comparisonValueRaw);
  }

  const hasAnyComparison = Boolean(comparisonField || comparisonOperator || comparisonValue !== null);
  if (hasAnyComparison) {
    if (!comparisonField || !comparisonOperator || comparisonValue === null) {
      throw new Error("Preencha campo, operador e valor para comparacao.");
    }
    if (getRecordFieldType(comparisonField) !== "number") {
      throw new Error("O campo de comparacao precisa ser numerico para operacoes matematicas.");
    }
    const toNumber = (value: string | number) => {
      if (typeof value === "number") {
        return value;
      }
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        throw new Error("Valor numerico de comparacao invalido.");
      }
      return numeric;
    };
    if (Array.isArray(comparisonValue)) {
      if (comparisonValue.length === 0) {
        throw new Error("Informe um valor para a operacao.");
      }
      comparisonValue = toNumber(comparisonValue[0] as string | number);
    } else {
      comparisonValue = toNumber(comparisonValue as string | number);
    }
    if (comparisonOperator === "lt" && comparisonValue === 0) {
      throw new Error("Nao e permitido dividir por zero.");
    }
  }

  return {
    name,
    chartType,
    xField,
    yField,
    pivotConfig,
    comparisonField,
    comparisonOperator,
    comparisonValue,
  };
}

export async function listSavedCharts() {
  const charts = await prisma.savedChart.findMany({
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
  return charts.map(toSavedChartDto);
}

export async function createSavedChart(rawInput: unknown) {
  const input = validateSavedChartInput(rawInput);
  const chart = await prisma.savedChart.create({
    data: {
      name: input.name,
      chartType: input.chartType,
      xField: input.xField,
      yField: input.yField,
      comparisonField: null,
      comparisonOperator: null,
      comparisonValue: (input.pivotConfig ?? input.comparisonValue ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
  return toSavedChartDto(chart);
}

export async function updateSavedChart(id: string, rawInput: unknown) {
  if (!id) {
    throw new Error("ID do grafico invalido.");
  }
  const input = validateSavedChartInput(rawInput);
  const chart = await prisma.savedChart.update({
    where: { id },
    data: {
      name: input.name,
      chartType: input.chartType,
      xField: input.xField,
      yField: input.yField,
      comparisonField: null,
      comparisonOperator: null,
      comparisonValue: (input.pivotConfig ?? input.comparisonValue ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
  return toSavedChartDto(chart);
}

export async function deleteSavedChart(id: string) {
  if (!id) {
    throw new Error("ID do grafico invalido.");
  }
  await prisma.savedChart.delete({ where: { id } });
  return { id };
}
