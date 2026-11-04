import { Users } from "lucide-react";
import type { Metadata } from "next";

import { BotaoLink, Cabecalho, Card, Voltar } from "@/components/ui";
import { UsoDoPlano } from "@/components/uso-do-plano";
import { exigirProfessor } from "@/lib/auth";
import { contarAlunosAtivos, listarInstituicoes } from "@/lib/consultas";
import { cabeMaisUmAluno, limiteDeAlunos, nomeDoPlano } from "@/lib/planos";

import { FormAluno } from "../form-aluno";

export const metadata: Metadata = { title: "Novo aluno" };

export default async function PaginaNovoAluno() {
  const professor = await exigirProfessor();
  const [instituicoes, ativos] = await Promise.all([listarInstituicoes(professor.id), contarAlunosAtivos(professor.id)]);
  const limite = limiteDeAlunos(professor);

  // plano cheio: avisa logo, sem mostrar um formulário que não vai poder ser salvo
  if (limite != null && !cabeMaisUmAluno(professor, ativos)) {
    return (
      <>
        <Voltar href="/alunos">Voltar para alunos</Voltar>
        <Cabecalho titulo="Novo aluno" />
        <Card className="max-w-2xl p-6">
          <span className="mb-3 inline-flex rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Users className="size-5" />
          </span>
          <h2 className="text-lg font-semibold">Você chegou ao limite do seu plano</h2>
          <p className="mt-1 text-sm text-suave">
            O plano {nomeDoPlano(professor.plano)} permite até {limite} alunos ativos, e você já tem {ativos}. Para cadastrar outro aluno, desative
            um aluno que não tem mais aula (ele continua no histórico, com chamadas e recibos) ou mude para o plano Premium, com alunos ilimitados.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <BotaoLink href="/alunos">Ver meus alunos</BotaoLink>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Voltar href="/alunos">Voltar para alunos</Voltar>
      <Cabecalho titulo="Novo aluno" />
      <UsoDoPlano professor={professor} />
      <FormAluno instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))} diaPadrao={professor.diaVencimento} duracaoPadrao={professor.duracaoAula} />
    </>
  );
}
