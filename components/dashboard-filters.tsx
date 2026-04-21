"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFilterOptionsAction } from "@/app/actions/get-filter-options";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardFilters } from "@/services/filter-options";

type MultiSelectProps = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  isOpen: boolean;
  onToggleOpen: (id: string) => void;
};

const MultiSelect = memo(function MultiSelect({
  id,
  label,
  options,
  selected,
  onToggle,
  isOpen,
  onToggleOpen,
}: MultiSelectProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <button
        type="button"
        className="w-full cursor-pointer text-left text-sm text-zinc-300"
        onClick={() => onToggleOpen(id)}
      >
        {label}{" "}
        <span className="text-zinc-500">
          ({selected.length > 0 ? `${selected.length} selecionado(s)` : "todos"})
        </span>
      </button>
      {isOpen ? (
        <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
                className="size-4 rounded border-zinc-600 bg-zinc-900"
              />
              <span className="text-zinc-200">{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
});

export const initialFilters: DashboardFilters = {
  promotores: [],
  coordenadores: [],
  clientes: [],
  tiposFaturamento: [],
  anos: [],
  meses: [],
};

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

type DashboardFiltersProps = {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
};

export function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);
  const queryKey = useMemo(() => ["filter-options", filters], [filters]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => getFilterOptionsAction(filters),
    placeholderData: (previousData) => previousData,
  });

  const toggleStringFilter = useCallback((
    key: "promotores" | "coordenadores" | "clientes" | "tiposFaturamento",
    value: string
  ) => {
    const exists = filters[key].includes(value);
    onChange({
      ...filters,
      [key]: exists
        ? filters[key].filter((item) => item !== value)
        : [...filters[key], value],
    });
  }, [filters, onChange]);

  const toggleYearFilter = useCallback((value: number) => {
    const exists = filters.anos.includes(value);
    onChange({
      ...filters,
      anos: exists ? filters.anos.filter((year) => year !== value) : [...filters.anos, value],
    });
  }, [filters, onChange]);

  const toggleMonthFilter = useCallback((value: number) => {
    const exists = filters.meses.includes(value);
    onChange({
      ...filters,
      meses: exists ? filters.meses.filter((month) => month !== value) : [...filters.meses, value],
    });
  }, [filters, onChange]);

  const toggleOpenFilter = useCallback((id: string) => {
    setOpenFilterId((current) => (current === id ? null : id));
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-zinc-400">{isLoading ? "Carregando filtros..." : "Filtros"}</p>
        <Button
          variant="outline"
          onClick={() => onChange(initialFilters)}
          className="rounded-xl border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
        >
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <Skeleton className="h-4 w-24 bg-zinc-800" />
              <Skeleton className="mt-2 h-8 w-full bg-zinc-800" />
            </div>
          ))
        ) : null}
        {!isLoading ? (
          <>
            <MultiSelect
              id="promotor"
              label="Promotor"
              options={(data?.promotores ?? []).map((item) => ({ value: item, label: item }))}
              selected={filters.promotores}
              onToggle={(value) => toggleStringFilter("promotores", value)}
              isOpen={openFilterId === "promotor"}
              onToggleOpen={toggleOpenFilter}
            />
            <MultiSelect
              id="coordenador"
              label="Coordenador"
              options={(data?.coordenadores ?? []).map((item) => ({ value: item, label: item }))}
              selected={filters.coordenadores}
              onToggle={(value) => toggleStringFilter("coordenadores", value)}
              isOpen={openFilterId === "coordenador"}
              onToggleOpen={toggleOpenFilter}
            />
            <MultiSelect
              id="cliente"
              label="Cliente"
              options={(data?.clientes ?? []).map((item) => ({ value: item, label: item }))}
              selected={filters.clientes}
              onToggle={(value) => toggleStringFilter("clientes", value)}
              isOpen={openFilterId === "cliente"}
              onToggleOpen={toggleOpenFilter}
            />
            <MultiSelect
              id="tipo-faturamento"
              label="Tipo Faturamento"
              options={(data?.tiposFaturamento ?? []).map((item) => ({ value: item, label: item }))}
              selected={filters.tiposFaturamento}
              onToggle={(value) => toggleStringFilter("tiposFaturamento", value)}
              isOpen={openFilterId === "tipo-faturamento"}
              onToggleOpen={toggleOpenFilter}
            />
            <MultiSelect
              id="ano"
              label="Ano"
              options={(data?.anos ?? []).map((year) => ({
                value: String(year),
                label: String(year),
              }))}
              selected={filters.anos.map((year) => String(year))}
              onToggle={(value) => toggleYearFilter(Number(value))}
              isOpen={openFilterId === "ano"}
              onToggleOpen={toggleOpenFilter}
            />
            <MultiSelect
              id="meses"
              label="Meses"
              options={(data?.meses ?? []).map((month) => ({
                value: String(month),
                label: monthLabelByNumber[month] ?? String(month),
              }))}
              selected={filters.meses.map((month) => String(month))}
              onToggle={(value) => toggleMonthFilter(Number(value))}
              isOpen={openFilterId === "meses"}
              onToggleOpen={toggleOpenFilter}
            />
          </>
        ) : null}
      </div>

      {isFetching && !isLoading ? (
        <p className="mt-3 text-xs text-zinc-500">Atualizando opcoes...</p>
      ) : null}
    </section>
  );
}
