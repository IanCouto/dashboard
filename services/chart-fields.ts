export type RecordFieldType = "string" | "number";

export const recordFieldDefinitions = [
  { key: "promotor", label: "Promotor", type: "string" },
  { key: "coordenador", label: "Coordenador", type: "string" },
  { key: "descricao_cliente", label: "Descricao cliente", type: "string" },
  { key: "tipo_faturamento", label: "Tipo faturamento", type: "string" },
  { key: "ano", label: "Ano", type: "number" },
  { key: "total", label: "Total", type: "number" },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  type: RecordFieldType;
}>;

export type RecordFieldKey = (typeof recordFieldDefinitions)[number]["key"];

export type SavedChartType = "bar" | "column" | "line";
export type SavedChartOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";

export const savedChartTypes: SavedChartType[] = ["bar", "column", "line"];

export const operatorsByFieldType: Record<RecordFieldType, SavedChartOperator[]> = {
  string: ["eq", "neq", "gt", "lt"],
  number: ["eq", "neq", "gt", "lt"],
};

export function isRecordFieldKey(value: string): value is RecordFieldKey {
  return recordFieldDefinitions.some((field) => field.key === value);
}

export function getRecordFieldType(field: RecordFieldKey): RecordFieldType {
  return recordFieldDefinitions.find((item) => item.key === field)?.type ?? "string";
}

export function getChartFieldOptions() {
  return recordFieldDefinitions.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    operators: operatorsByFieldType[field.type],
  }));
}
