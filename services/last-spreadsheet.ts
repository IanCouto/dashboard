import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const contentPath = path.join(dataDir, "last-spreadsheet.bin");
const metaPath = path.join(dataDir, "last-spreadsheet.json");

type SpreadsheetMeta = {
  fileName: string;
};

// ponytail: last upload lives on local disk (cwd/data). Ceiling: single-instance / lost on ephemeral hosts; move to object storage if that becomes a problem.
export async function saveLastSpreadsheet(fileName: string, content: Uint8Array) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(contentPath, content);
  await writeFile(metaPath, JSON.stringify({ fileName } satisfies SpreadsheetMeta));
}

export async function getLastSpreadsheetMeta(): Promise<SpreadsheetMeta | null> {
  try {
    const meta = JSON.parse(await readFile(metaPath, "utf8")) as SpreadsheetMeta;
    return meta.fileName ? meta : null;
  } catch {
    return null;
  }
}

export async function getLastSpreadsheet() {
  const meta = await getLastSpreadsheetMeta();
  if (!meta) {
    return null;
  }

  try {
    return {
      fileName: meta.fileName,
      content: await readFile(contentPath),
    };
  } catch {
    return null;
  }
}
