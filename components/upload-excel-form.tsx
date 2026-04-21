"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type UploadState = {
  status: "idle" | "success" | "error";
  message: string;
};

export function UploadExcelForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle", message: "" });
  const [isPending, setIsPending] = useState(false);

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
    } catch {
      setState({
        status: "error",
        message: "Falha de rede ao enviar arquivo. Tente novamente.",
      });
    } finally {
      setIsPending(false);
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

      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="rounded-xl bg-white text-black transition hover:bg-zinc-200 disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "Upload Excel"}
      </Button>

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
