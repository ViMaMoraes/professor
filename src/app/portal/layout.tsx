import { Bell } from "lucide-react";
import Link from "next/link";

import { BancoDesatualizado } from "@/components/banco-desatualizado";
import { CaixaUsuario } from "@/components/caixa-usuario";
import { Logo } from "@/components/logo";
import { exigirAlunoComProfessor } from "@/lib/auth";
import { rotuloCurso } from "@/lib/agenda";
import { cursosDaConta, videosDoAluno } from "@/lib/consultas";
import { ehEstudio } from "@/lib/planos";
import { migracoesPendentes } from "@/lib/db";
import { chavePublicaVapid } from "@/lib/push";

import { AbasPortal } from "./abas-portal";
import { LembrarAcesso } from "./lembrar-acesso";

export default async function LayoutPortal({ children }: LayoutProps<"/portal">) {
  const pendentes = await migracoesPendentes();
  if (pendentes.length) return <BancoDesatualizado pendentes={pendentes} paraAluno />;
  // checa o login antes de qualquer coisa: visitante sem sessão recebe redirecionamento direto
  const { aluno, professor } = await exigirAlunoComProfessor();
  // as abas aparecem sempre (Início e Presença); a de Vídeos só quando há vídeo liberado para o aluno
  const [temVideos, cursos] = await Promise.all([
    videosDoAluno(aluno).then((v) => v.videos.length > 0),
    ehEstudio(professor) ? cursosDaConta(professor.id, { alunoId: aluno.id }) : [],
  ]);
  // no estúdio, o aluno vê o nome do estúdio e os professores dele por curso ("Piano com Paula")
  const deQuem = ehEstudio(professor) ? (professor.nomeEstudio ?? professor.nome) : professor.nome;
  const professoresDoAluno = cursos.map((c) => rotuloCurso(c.nome, c.membro ?? professor.nome)).join(" · ");
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <span className="min-w-0 leading-tight">
              <span className="block font-semibold whitespace-nowrap">Acesso aluno</span>
              <span className="block truncate text-xs text-suave">{deQuem}</span>
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
        <AbasPortal videos={temVideos} />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      {aluno.usuario && (
        <LembrarAcesso
          usuario={aluno.usuario}
          codigo={professor.codigo ?? ""}
          nome={aluno.nome}
          professor={professoresDoAluno || deQuem}
          chave={aluno.chave ?? undefined}
        />
      )}
    </>
  );
}
