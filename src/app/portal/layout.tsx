import { Bell } from "lucide-react";
import Link from "next/link";

import { BancoDesatualizado } from "@/components/banco-desatualizado";
import { CaixaUsuario } from "@/components/caixa-usuario";
import { Logo } from "@/components/logo";
import { exigirAlunoComProfessor } from "@/lib/auth";
import { migracoesPendentes } from "@/lib/db";
import { chavePublicaVapid } from "@/lib/push";

export default async function LayoutPortal({ children }: LayoutProps<"/portal">) {
  const pendentes = await migracoesPendentes();
  if (pendentes.length) return <BancoDesatualizado pendentes={pendentes} paraAluno />;
  // checa o login antes de qualquer coisa: visitante sem sessão recebe redirecionamento direto
  const { aluno, professor } = await exigirAlunoComProfessor();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <span className="min-w-0 leading-tight">
              <span className="block font-semibold whitespace-nowrap">Acesso aluno</span>
              <span className="block truncate text-xs text-suave">{professor.nome}</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {chavePublicaVapid() && (
              <Link
                href="/portal#notificacoes"
                className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-texto"
                title="Notificações"
                aria-label="Notificações"
              >
                <Bell className="size-5" />
              </Link>
            )}
            <div className="w-36 sm:w-52">
              <CaixaUsuario nome={aluno.nome} detalhe={aluno.usuario ?? "Aluno"} />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
