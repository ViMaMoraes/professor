import { KeyRound, Music } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CaixaUsuario } from "@/components/caixa-usuario";
import { Esqueleto } from "@/components/ui";
import { exigirAluno } from "@/lib/auth";

export default function LayoutPortal({ children }: LayoutProps<"/portal">) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/portal" className="flex items-center gap-2.5 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-marca text-white">
              <Music className="size-4" />
            </span>
            <span className="hidden sm:inline">Aula de Música</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/portal/senha" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-suave hover:bg-fundo sm:flex">
              <KeyRound className="size-4" /> Trocar senha
            </Link>
            <Suspense fallback={<Esqueleto className="h-12 w-48" />}>
              <Usuario />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}

async function Usuario() {
  const aluno = await exigirAluno();
  return (
    <div className="w-52">
      <CaixaUsuario nome={aluno.nome} detalhe={aluno.instrumento ?? "Aluno"} />
    </div>
  );
}
