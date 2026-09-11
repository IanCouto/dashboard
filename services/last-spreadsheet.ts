import { prisma } from "@/lib/prisma";

const SINGLETON_ID = 1;

type SpreadsheetMeta = {
  fileName: string;
};

export async function saveLastSpreadsheet(fileName: string, content: Uint8Array) {
  await prisma.uploadedSpreadsheet.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, fileName, content },
    update: { fileName, content },
  });
}

export async function getLastSpreadsheetMeta(): Promise<SpreadsheetMeta | null> {
  const row = await prisma.uploadedSpreadsheet.findUnique({
    where: { id: SINGLETON_ID },
    select: { fileName: true },
  });
  return row ? { fileName: row.fileName } : null;
}

export async function getLastSpreadsheet() {
  const row = await prisma.uploadedSpreadsheet.findUnique({
    where: { id: SINGLETON_ID },
  });

  if (!row) {
    return null;
  }

  return {
    fileName: row.fileName,
    content: row.content,
  };
}
