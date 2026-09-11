import { NextResponse } from "next/server";
import { getLastSpreadsheet, getLastSpreadsheetMeta } from "@/services/last-spreadsheet";

export const dynamic = "force-dynamic";

function mimeFromFileName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }
  return "application/octet-stream";
}

function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "planilha.xlsx";
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("meta") === "1") {
    const meta = await getLastSpreadsheetMeta();
    if (!meta) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true, fileName: meta.fileName });
  }

  const latest = await getLastSpreadsheet();
  if (!latest) {
    return NextResponse.json(
      { status: "error", message: "Nenhuma planilha enviada ainda." },
      { status: 404 }
    );
  }

  return new NextResponse(Buffer.from(latest.content), {
    headers: {
      "Content-Type": mimeFromFileName(latest.fileName),
      "Content-Disposition": contentDisposition(latest.fileName),
      "Cache-Control": "no-store",
    },
  });
}
