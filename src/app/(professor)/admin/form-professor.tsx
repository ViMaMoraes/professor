"use client";

import { Check, UserPlus } from "lucide-react";
import { criarProfessor, salvarProfessor } from "@/app/acoes/admin";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, Input } from "@/components/ui";

import { Credenciais } from "./credenciais";

type Dados = { id: number; nome: string; email: string; acessoAte: string | null; ativo: boolean; master: boolean };

function Campos({ professor }: { professor?: Dados }) {
  return (
    <>
      <Campo rotulo="Nome *">
        <Input name="nome" required defaultValue={professor?.nome} />
      </Campo>
      <Campo rotulo="E-mail (login) *">
        <Input type="email" name="email" required defaultValue={professor?.email} />
      </Campo>
      {!professor?.master && (
        <Campo rotulo="Acesso até" dica="Data em que a assinatura vence. Em branco = sem limite.">
          <Input type="date" name="acessoAte" defaultValue={professor?.acessoAte ?? ""} />
        </Campo>
      )}
      {!professor?.master && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="ativo" defaultChecked={professor?.ativo ?? true} className="size-4 accent-marca" />
          Conta liberada (desmarque para bloquear o acesso do professor e dos alunos dele)
        </label>
      )}
    </>
  );
}

/** Editar um professor existente. A senha não é editada aqui: use "Gerar nova senha". */
export function FormProfessor({ professor }: { professor: Dados }) {
  return (
    <Formulario acao={salvarProfessor.bind(null, professor.id)} className="max-w-2xl">
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Campos professor={professor} />
        <div className="flex gap-2 sm:col-span-2">
          <BotaoEnviar>
            <Check /> Salvar
          </BotaoEnviar>
          <BotaoLink href="/admin" variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}

/** Novo professor: a senha é gerada pelo site e mostrada uma vez, com a mensagem pronta para enviar. */
export function FormNovoProfessor({ endereco }: { endereco: string | null }) {
  return (
    <Formulario
      acao={criarProfessor}
      className="max-w-2xl"
      sucesso={(estado) => (
        <div className="space-y-4">
          <Credenciais nome={estado.nome!} email={estado.email!} senha={estado.senha!} nova endereco={endereco} />
          <div className="flex gap-2">
            <BotaoLink href="/admin">Voltar para a administração</BotaoLink>
            <BotaoLink href={`/admin/${estado.id}`} variante="secundario">
              Ver conta
            </BotaoLink>
          </div>
        </div>
      )}
    >
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Campos />
        <p className="text-sm text-suave sm:col-span-2">
          A senha é gerada automaticamente. Depois de criar, você copia os dados de acesso para enviar ao professor; no primeiro login ele
          cria a própria senha.
        </p>
        <div className="flex gap-2 sm:col-span-2">
          <BotaoEnviar>
            <UserPlus /> Criar conta
          </BotaoEnviar>
          <BotaoLink href="/admin" variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}
