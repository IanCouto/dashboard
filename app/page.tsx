import { DashboardOverview } from "@/components/dashboard-overview";
import { UploadExcelForm } from "@/components/upload-excel-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex w-full max-w-[90vw] flex-col gap-6 px-4 py-6 md:px-8 lg:px-10">
        <header className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
          <div className="flex flex-wrap gap-3">
            <UploadExcelForm />
          </div>
        </header>

        <DashboardOverview />
      </div>
    </main>
  );
}
