import { NextResponse } from "next/server";
import { parseExcelFile } from "@/lib/excel";
import { replaceRecordsFromRows } from "@/services/records-ingestion";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("excelFile");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { status: "error", message: "Selecione um arquivo Excel para enviar." },
      { status: 400 }
    );
  }

  const fileName = file.name.toLowerCase();
  const isExcelFile = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

  if (!isExcelFile) {
    return NextResponse.json(
      { status: "error", message: "Formato invalido. Use .xlsx ou .xls." },
      { status: 400 }
    );
  }

  try {
    const parsed = await parseExcelFile(file);
    const ingestion = await replaceRecordsFromRows(parsed.rows, parsed.headers);

    return NextResponse.json({
      status: "success",
      message: `Upload concluido: ${ingestion.inputRows} linhas lidas e ${ingestion.normalizedRows} linhas normalizadas salvas.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel processar o arquivo Excel.";

    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
