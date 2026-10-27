"use client";

import { Check } from "lucide-react";

import { salvarConfiguracoes } from "@/app/acoes/configuracoes";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { CampoAssinatura } from "@/components/campo-assinatura";
import { Campo, Card, Input } from "@/components/ui";
import type { Professor } from "@/lib/db/schema";

export function FormConfiguracoes({ professor: p }: { professor: Omit<Professor, "senhaHash"> }) {
  return (
    <Formulario acao={salvarConfiguracoes} className="max-w-3xl">
      <Card className="divide-y divide-borda">
        <section className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="font-semibold">Seus dados</h2>
            <p className="text-sm text-suave">Saem no recibo: “Eu, Nome, CPF…, RG…, residente na Endereço - Cidade, recebi…”.</p>
          </div>
          <Campo rotulo="Nome *">
            <Input name="nome" required defaultValue={p.nome} />
          </Campo>
          <Campo rotulo="E-mail (login) *">
            <Input type="email" name="email" required defaultValue={p.email} />
          </Campo>
          <Campo rotulo="CPF ou CNPJ">
            <Input name="documento" defaultValue={p.documento ?? ""} />
          </Campo>
          <Campo rotulo="RG">
            <Input name="rg" defaultValue={p.rg ?? ""} />
          </Campo>
          <Campo rotulo="Endereço" className="sm:col-span-2">
            <Input name="endereco" placeholder="Rua Exemplo, 113 - Bairro" defaultValue={p.endereco ?? ""} />
          </Campo>
          <Campo rotulo="Cidade/UF" dica="A cidade (sem a UF) vai na linha da data do recibo.">
            <Input name="cidade" placeholder="Salto/SP" defaultValue={p.cidade ?? ""} />
          </Campo>
          <Campo rotulo="Telefone">
            <Input name="telefone" defaultValue={p.telefone ?? ""} />
          </Campo>
        </section>
        <section className="p-5">
          <h2 className="font-semibold">Assinatura</h2>
          <p className="mb-3 text-sm text-suave">Vai impressa no recibo, em cima da linha de assinatura.</p>
          <CampoAssinatura name="assinatura" atual={p.assinatura} />
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
