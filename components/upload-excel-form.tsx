"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type UploadState = {
  status: "idle" | "success" | "error";
  message: string;
};

function filenameFromDisposition(header: string | null) {
  if (!header) {
    return "planilha.xlsx";
  }

  const utfName = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utfName) {
    return decodeURIComponent(utfName);
  }

  return header.match(/filename="([^"]+)"/i)?.[1] ?? "planilha.xlsx";
}

export function UploadExcelForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle", message: "" });
  const [isPending, setIsPending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasLastSpreadsheet, setHasLastSpreadsheet] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/last-spreadsheet?meta=1")
      .then(async (response) => {
        if (!response.ok) {
          return { exists: false };
        }
        return (await response.json()) as { exists: boolean };
      })
      .then((payload) => {
        if (!cancelled) {
          setHasLastSpreadsheet(Boolean(payload.exists));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasLastSpreadsheet(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsPending(true);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as UploadState;
      setState(payload);
      if (payload.status === "success") {
        setHasLastSpreadsheet(true);
      }
    } catch {
      setState({
        status: "error",
        message: "Falha de rede ao enviar arquivo. Tente novamente.",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const response = await fetch("/api/last-spreadsheet");
      if (!response.ok) {
        setState({
          status: "error",
          message: "Nenhuma planilha enviada ainda.",
        });
        setHasLastSpreadsheet(false);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filenameFromDisposition(response.headers.get("Content-Disposition"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setState({
        status: "error",
        message: "Nao foi possivel baixar a planilha. Tente novamente.",
      });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <form
      action="/api/upload"
      method="post"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      className="flex flex-col gap-2"
    >
      <input
        ref={inputRef}
        type="file"
        name="excelFile"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={() => {
          if (inputRef.current?.files?.length) {
            inputRef.current.form?.requestSubmit();
          }
        }}
      />

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="rounded-xl bg-white text-black transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {isPending ? "Enviando..." : "Upload Excel"}
        </Button>

        <Button
          type="button"
          onClick={handleDownload}
          disabled={!hasLastSpreadsheet || isDownloading}
          className="rounded-xl border border-zinc-600 bg-transparent text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {isDownloading ? "Baixando..." : "Baixar planilha"}
        </Button>
      </div>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "error"
              ? "text-xs text-red-400"
              : "text-xs text-emerald-400"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
