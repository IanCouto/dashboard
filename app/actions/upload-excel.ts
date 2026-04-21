"use server";

import { parseExcelFile } from "@/lib/excel";
import { replaceRecordsFromRows } from "@/services/records-ingestion";

export type UploadExcelState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialUploadExcelState: UploadExcelState = {
  status: "idle",
  message: "",
};

export async function uploadExcelAction(
  _previousState: UploadExcelState,
  formData: FormData
): Promise<UploadExcelState> {
  const file = formData.get("excelFile");

  if (!(file instanceof File)) {
    return { status: "error", message: "Selecione um arquivo Excel para enviar." };
  }

  const fileName = file.name.toLowerCase();
  const isExcelFile = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

  if (!isExcelFile) {
    return { status: "error", message: "Formato invalido. Use .xlsx ou .xls." };
  }

  try {
    const parsed = await parseExcelFile(file);
    const ingestion = await replaceRecordsFromRows(parsed.rows, parsed.headers);

    return {
      status: "success",
      message: `Upload concluido: ${ingestion.inputRows} linhas lidas e ${ingestion.normalizedRows} linhas normalizadas salvas.`,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel processar o arquivo Excel.";

    return {
      status: "error",
      message,
    };
  }
}
