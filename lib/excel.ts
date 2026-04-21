import { read, utils } from "xlsx";

export type ParsedExcelResult = {
  sheetName: string;
  totalRows: number;
  headers: string[];
  rows: Array<Record<string, unknown>>;
};

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

  if (matrix.length < 2) {
    throw new Error("Arquivo sem cabecalho valido na linha 2.");
  }

  // Regra do arquivo: linha 1 e ignorada, linha 2 contem os cabecalhos.
  const rawHeaders = matrix[1] ?? [];
  const headers = rawHeaders.map((header, index) => {
    const value = String(header ?? "").trim();
    return value.length > 0 ? value : `__EMPTY_${index}`;
  });

  const hasAtLeastOneNamedHeader = headers.some((header) => !header.startsWith("__EMPTY_"));
  if (!hasAtLeastOneNamedHeader) {
    throw new Error("Nenhum cabecalho encontrado na linha 2.");
  }

  const rows = matrix.slice(2).map((row) => {
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
    rows,
  };
}
