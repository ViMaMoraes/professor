"use client";

import { Check } from "lucide-react";

import { salvarProfessor } from "@/app/acoes/admin";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, Input } from "@/components/ui";

type Dados = { id: number; nome: string; email: string; acessoAte: string | null; ativo: boolean; master: boolean };

export function FormProfessor({ professor }: { professor?: Dados }) {
  const acao = salvarProfessor.bind(null, professor?.id ?? null);
  return (
    <Formulario acao={acao} className="max-w-2xl">
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Campo rotulo="Nome *">
          <Input name="nome" required defaultValue={professor?.nome} />
        </Campo>
        <Campo rotulo="E-mail (login) *">
          <Input type="email" name="email" required defaultValue={professor?.email} />
        </Campo>
        <Campo
          rotulo={professor ? "Nova senha" : "Senha inicial *"}
          dica={professor ? "Deixe em branco para manter a atual." : "Passe para o professor; ele pode trocar depois em Configurações."}
        >
          <Input name="senha" minLength={6} required={!professor} autoComplete="new-password" />
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
        <div className="flex gap-2 sm:col-span-2">
          <BotaoEnviar>
            <Check /> {professor ? "Salvar" : "Criar conta"}
          </BotaoEnviar>
          <BotaoLink href="/admin" variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}
