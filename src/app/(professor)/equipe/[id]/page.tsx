import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { excluirMembro, novaSenhaMembro } from "@/app/acoes/equipe";
import { BotaoAcao } from "@/components/botao-acao";
import { Cabecalho, Card, Voltar } from "@/components/ui";
import { exigirDono } from "@/lib/auth";
import { buscarMembro } from "@/lib/consultas";
import { enderecoSite } from "@/lib/endereco";

import { RedefinirSenha } from "../../admin/[id]/redefinir-senha";
import { FormMembro } from "../form-membro";

export const metadata: Metadata = { title: "Equipe" };

export default async function PaginaMembro(props: PageProps<"/equipe/[id]">) {
  const professor = await exigirDono();
  if (professor.tipoConta !== "estudio") redirect("/equipe");
  const membro = await buscarMembro(professor.id, Number((await props.params).id));
  if (!membro) notFound();
  // só o que o formulário usa (nada de senha indo para o navegador)
  const { id, nome, email, cargo, modulos, todosAlunos, ativo } = membro;

  return (
    <>
      <Voltar href="/equipe">Voltar para a equipe</Voltar>
      <Cabecalho titulo={membro.nome} descricao="O que esta pessoa pode ver no estúdio." />
      <FormMembro membro={{ id, nome, email, cargo, modulos, todosAlunos, ativo }} />
      <div className="mt-6">
        <RedefinirSenha
          id={membro.id}
          nome={membro.nome}
          email={membro.email}
          pendente={membro.trocarSenha}
          endereco={enderecoSite()}
          gerar={novaSenhaMembro.bind(null, membro.id)}
        />
      </div>
      <Card className="mt-6 max-w-2xl border-red-200 p-5 dark:border-red-900">
        <h2 className="font-semibold text-red-600 dark:text-red-400">Tirar da equipe</h2>
        <p className="mt-1 mb-4 text-sm text-suave">
          Apaga só o acesso de {membro.nome}. Os alunos, chamadas, diário e recibos continuam no estúdio. Para só suspender, desmarque “Acesso
          liberado” acima.
        </p>
        <BotaoAcao acao={excluirMembro.bind(null, membro.id)} confirmar={`Tirar ${membro.nome} da equipe?`} variante="perigo">
          <Trash2 /> Tirar da equipe
        </BotaoAcao>
      </Card>
    </>
  );
}
