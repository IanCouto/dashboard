import { read, utils } from "xlsx";

export type ParsedExcelResult = {
  sheetName: string;
  totalRows: number;
  headers: string[];
  headerRowIndex: number;
  rows: Array<Record<string, unknown>>;
};

const HEADER_MARKERS = ["regiao", "promotor", "ano", "janeiro", "dezembro"] as const;

function normalizeHeaderCell(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findHeaderRowIndex(matrix: Array<Array<unknown>>): number {
  const limit = Math.min(15, matrix.length);

  for (let index = 0; index < limit; index++) {
    const cells = new Set((matrix[index] ?? []).map(normalizeHeaderCell));
    if (HEADER_MARKERS.every((marker) => cells.has(marker))) {
      return index;
    }
  }

  throw new Error("Nenhum cabecalho encontrado nas primeiras linhas da planilha.");
}

export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = read(Buffer.from(arrayBuffer), { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Arquivo Excel sem abas.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = utils.sheet_to_json<Array<string | number | null>>(worksheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  if (matrix.length < 1) {
    throw new Error("Arquivo Excel vazio.");
  }

  const headerRowIndex = findHeaderRowIndex(matrix);
  const rawHeaders = matrix[headerRowIndex] ?? [];
  const headers = rawHeaders.map((header, index) => {
    const value = String(header ?? "").trim();
    return value.length > 0 ? value : `__EMPTY_${index}`;
  });

  const rows = matrix.slice(headerRowIndex + 1).map((row) => {
    const mapped: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      mapped[header] = row[index] ?? null;
    });
    return mapped;
  });

  return {
    sheetName: firstSheetName,
    totalRows: rows.length,
    headers,
    headerRowIndex,
    rows,
  };
}
