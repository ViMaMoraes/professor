import type { ReactNode } from "react";

import { Logo } from "./logo";
import { Card } from "./ui";

export function TelaAuth({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-marca/5 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo grande className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-suave">{subtitulo}</p>
        </div>
        <Card className="p-6">{children}</Card>
      </div>
    </main>
  );
}
