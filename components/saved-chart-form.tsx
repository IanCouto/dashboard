"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecordFieldKey, SavedChartType } from "@/services/chart-fields";
import type { SavedChartDto } from "@/services/saved-charts";

type ChartFieldOption = {
  key: RecordFieldKey;
  label: string;
  type: "string" | "number";
};

export type SavedChartFormValues = {
  name: string;
  chartType: SavedChartType;
  xField: RecordFieldKey;
  yField: RecordFieldKey;
  rowFields: RecordFieldKey[];
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
};

const valueOperationOptions: Array<{
  value: SavedChartFormValues["valueOperation"];
  label: string;
}> = [
  { value: "sum", label: "Soma" },
  { value: "count", label: "Contagem" },
  { value: "average", label: "Media" },
  { value: "max", label: "Maximo" },
  { value: "min", label: "Minimo" },
  { value: "product", label: "Produto" },
  { value: "countNumbers", label: "Contar numeros" },
  { value: "stdDev", label: "Desvio padrao (amostra)" },
  { value: "stdDevp", label: "Desvio padrao populacional" },
  { value: "var", label: "Variancia (amostra)" },
  { value: "varp", label: "Variancia populacional" },
];

type SavedChartFormProps = {
  fields: ChartFieldOption[];
  chartTypes: SavedChartType[];
  initialValue?: SavedChartDto | null;
  isSubmitting?: boolean;
  onSubmit: (values: SavedChartFormValues) => void;
  onCancelEdit?: () => void;
};

function toFormValues(value: SavedChartDto | null | undefined, fields: ChartFieldOption[]): SavedChartFormValues {
  const firstNumeric = fields.find((field) => field.type === "number")?.key ?? "total";
  const firstString = fields.find((field) => field.type === "string")?.key ?? "promotor";
  if (!value) {
    return {
      name: "",
      chartType: "bar",
      xField: firstString,
      yField: firstNumeric,
      rowFields: [],
      valueOperation: "sum",
    };
  }
  return {
    name: value.name,
    chartType: value.chartType,
    xField: value.pivotConfig?.columnField ?? value.xField,
    yField: value.yField,
    rowFields: value.pivotConfig?.rowFields ?? [],
    valueOperation: value.pivotConfig?.valueOperation ?? "sum",
  };
}

export function SavedChartForm({
  fields,
  chartTypes,
  initialValue,
  isSubmitting = false,
  onSubmit,
  onCancelEdit,
}: SavedChartFormProps) {
  const [values, setValues] = useState<SavedChartFormValues>(() => toFormValues(initialValue, fields));

  return (
    <form
      className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-200">
          {initialValue ? "Atualizar grafico salvo" : "Criar novo grafico"}
        </h3>
        {onCancelEdit ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-lg border-zinc-700 p-0 text-zinc-200"
            onClick={onCancelEdit}
            aria-label={initialValue ? "Fechar modal de edicao" : "Fechar modal de criacao"}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-xs text-zinc-400">
          Nome
          <input
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Ex.: Valor por coordenador"
            maxLength={100}
            required
          />
        </label>

        <label className="space-y-1 text-xs text-zinc-400">
          Tipo
          <select
            value={values.chartType}
            onChange={(event) =>
              setValues((current) => ({ ...current, chartType: event.target.value as SavedChartType }))
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            {chartTypes.map((type) => (
              <option key={type} value={type}>
                {type === "bar" ? "Barra" : type === "column" ? "Coluna" : "Linha"}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs text-zinc-400">
          Coluna
          <select
            value={values.xField}
            onChange={(event) =>
              setValues((current) => ({ ...current, xField: event.target.value as RecordFieldKey }))
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            {fields.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs text-zinc-400">
          Valor
          <select
            value={values.yField}
            onChange={(event) =>
              setValues((current) => ({ ...current, yField: event.target.value as RecordFieldKey }))
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            {fields
              .filter((field) => field.type === "number")
              .map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Operacao
          <select
            value={values.valueOperation}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                valueOperation: event.target.value as SavedChartFormValues["valueOperation"],
              }))
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            {valueOperationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-1">
        <div className="space-y-1 text-xs text-zinc-400">
          Linhas
          <div className="max-h-32 space-y-1 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-2">
            {fields
              .filter((field) => field.type === "string")
              .map((field) => {
                const checked = values.rowFields.includes(field.key);
                return (
                  <label key={field.key} className="flex items-center gap-2 text-xs text-zinc-200">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setValues((current) => ({
                          ...current,
                          rowFields: checked
                            ? current.rowFields.filter((item) => item !== field.key)
                            : [...current.rowFields, field.key],
                        }))
                      }
                    />
                    {field.label}
                  </label>
                );
              })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="rounded-xl bg-blue-600 text-white hover:bg-blue-500" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : initialValue ? "Atualizar grafico" : "Salvar grafico"}
        </Button>
        {initialValue ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-zinc-700 text-zinc-200"
            onClick={onCancelEdit}
          >
            Cancelar edicao
          </Button>
        ) : null}
      </div>
    </form>
  );
}
