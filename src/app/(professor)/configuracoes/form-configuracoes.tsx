"use client";

import { Check } from "lucide-react";

import { salvarConfiguracoes } from "@/app/acoes/configuracoes";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, Card, Input } from "@/components/ui";
import type { Professor } from "@/lib/db/schema";

export function FormConfiguracoes({ professor: p }: { professor: Omit<Professor, "senhaHash"> }) {
  return (
    <Formulario acao={salvarConfiguracoes} className="max-w-3xl">
      <Card className="divide-y divide-borda">
        <section className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Seus dados</h2>
          <Campo rotulo="Nome *">
            <Input name="nome" required defaultValue={p.nome} />
          </Campo>
          <Campo rotulo="E-mail (login) *">
            <Input type="email" name="email" required defaultValue={p.email} />
          </Campo>
          <Campo rotulo="CPF ou CNPJ">
            <Input name="documento" defaultValue={p.documento ?? ""} />
          </Campo>
          <Campo rotulo="Telefone">
            <Input name="telefone" defaultValue={p.telefone ?? ""} />
          </Campo>
          <Campo rotulo="Endereço">
            <Input name="endereco" defaultValue={p.endereco ?? ""} />
          </Campo>
          <Campo rotulo="Cidade/UF">
            <Input name="cidade" placeholder="São Paulo/SP" defaultValue={p.cidade ?? ""} />
          </Campo>
          <Campo rotulo="Chave Pix" dica="Aparece no portal do aluno, com botão de copiar.">
            <Input name="chavePix" defaultValue={p.chavePix ?? ""} />
          </Campo>
        </section>
        <section className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Trocar senha</h2>
          <Campo rotulo="Senha atual">
            <Input type="password" name="senhaAtual" autoComplete="current-password" />
          </Campo>
          <Campo rotulo="Nova senha">
            <Input type="password" name="novaSenha" minLength={6} autoComplete="new-password" />
          </Campo>
        </section>
        <div className="p-5">
          <BotaoEnviar>
            <Check /> Salvar
          </BotaoEnviar>
        </div>
      </Card>
    </Formulario>
  );
}
