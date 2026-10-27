import { Music } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "./ui";

export function TelaAuth({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-marca/15 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-marca text-white shadow-lg shadow-marca/30">
            <Music className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-suave">{subtitulo}</p>
        </div>
        <Card className="p-6">{children}</Card>
      </div>
    </main>
  );
}
