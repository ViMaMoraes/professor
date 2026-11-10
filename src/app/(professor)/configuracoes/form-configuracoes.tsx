"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { salvarConfiguracoes } from "@/app/acoes/configuracoes";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { InputMascara } from "@/components/input-mascara";
import { SelectVencimento } from "@/components/select-vencimento";
import { DURACOES, LEMBRETES } from "@/lib/agenda";
import { CampoAssinatura } from "@/components/campo-assinatura";
import { Campo, Card, Input, Select } from "@/components/ui";
import type { Professor } from "@/lib/db/schema";
import { planoPermiteEquipe } from "@/lib/planos";

export function FormConfiguracoes({ professor: p }: { professor: Omit<Professor, "senhaHash"> }) {
  return (
    <Formulario acao={salvarConfiguracoes} className="max-w-3xl">
      <Card className="divide-y divide-borda">
        <TipoDeConta tipo={p.tipoConta} nomeEstudio={p.nomeEstudio} permiteEstudio={planoPermiteEquipe(p)} />
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
            <InputMascara mascara="documento" name="documento" defaultValue={p.documento} />
          </Campo>
          <Campo rotulo="RG">
            <InputMascara mascara="rg" name="rg" defaultValue={p.rg} />
          </Campo>
          <Campo rotulo="Endereço" className="sm:col-span-2">
            <Input name="endereco" placeholder="Rua Exemplo, 113 - Bairro" defaultValue={p.endereco ?? ""} />
          </Campo>
          <Campo rotulo="Cidade/UF" dica="A cidade (sem a UF) vai na linha da data do recibo.">
            <Input name="cidade" placeholder="Salto/SP" defaultValue={p.cidade ?? ""} />
          </Campo>
          <Campo rotulo="Chave Pix" dica="Vai na mensagem de cobrança do Financeiro.">
            <Input name="chavePix" defaultValue={p.chavePix ?? ""} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          </Campo>
          <Campo rotulo="Duração padrão da aula" dica="Usada nos horários e reposições sem duração própria.">
            <Select name="duracaoAula" defaultValue={p.duracaoAula}>
              {DURACOES.map((d) => (
                <option key={d} value={d}>
                  {d} minutos
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Lembrete da aula para o aluno" dica="Notificação no celular do aluno antes de cada aula.">
            <Select name="lembreteMinutos" defaultValue={p.lembreteMinutos}>
              {LEMBRETES.map(([min, nome]) => (
                <option key={min} value={min}>
                  {nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Vencimento das mensalidades" dica="Dia padrão; dá para mudar no cadastro de cada aluno ou instituição.">
            <SelectVencimento name="diaVencimento" valor={p.diaVencimento} />
          </Campo>
          <Campo rotulo="Telefone">
            <InputMascara mascara="telefone" name="telefone" defaultValue={p.telefone} />
          </Campo>
          <Campo
            rotulo="Código do professor"
            dica="Identifica você no acesso do aluno e vai no link pessoal de cada um. Se trocar, mande o link de novo aos alunos que entraram depois desta mudança."
          >
            <Input
              name="codigo"
              defaultValue={p.codigo ?? ""}
              required
              minLength={3}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
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

/** Professor sozinho ou estúdio/escola: o estúdio ganha a Equipe e o recibo sai no nome dele. */
function TipoDeConta({
  tipo,
  nomeEstudio,
  permiteEstudio,
}: {
  tipo: Professor["tipoConta"];
  nomeEstudio: string | null;
  permiteEstudio: boolean;
}) {
  // plano sem equipe: a opção aparece, mas só libera no plano Estúdio
  const [atual, setAtual] = useState(permiteEstudio ? tipo : "autonomo");
  return (
    <section className="grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="font-semibold">Tipo de conta</h2>
        <p className="text-sm text-suave">No estúdio ou escola, você cadastra a equipe e libera o que cada um vê.</p>
      </div>
      <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
        {(
          [
            ["autonomo", "Professor autônomo", "Só você usa a conta."],
            ["estudio", "Estúdio ou escola", "Você e uma equipe de professores, com permissões."],
          ] as const
        ).map(([valor, nome, descricao]) => (
          <label
            key={valor}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-borda p-3 has-checked:border-marca has-checked:bg-marca-suave has-disabled:cursor-not-allowed has-disabled:opacity-60"
          >
            <input
              type="radio"
              name="tipoConta"
              value={valor}
              checked={atual === valor}
              disabled={valor === "estudio" && !permiteEstudio}
              onChange={() => setAtual(valor)}
              className="mt-1 size-4 accent-marca"
            />
            <span>
              <span className="block text-sm font-medium">{nome}</span>
              <span className="block text-xs text-suave">
                {valor === "estudio" && !permiteEstudio
                  ? "Disponível no plano Estúdio. Fale com o suporte para mudar de plano."
                  : descricao}
              </span>
            </span>
          </label>
        ))}
      </div>
      {atual === "estudio" && (
        <Campo
          rotulo="Nome do estúdio ou escola"
          dica="O recibo sai no nome dele, com o CPF/CNPJ e o endereço abaixo. Em branco, sai no seu nome."
          className="sm:col-span-2"
        >
          <Input name="nomeEstudio" defaultValue={nomeEstudio ?? ""} placeholder="ex.: Estúdio Harmonia" maxLength={80} />
        </Campo>
      )}
      {tipo === "estudio" && atual === "autonomo" && (
        <p className="text-sm text-amber-700 sm:col-span-2 dark:text-amber-300">
          Voltando para autônomo, a equipe para de conseguir entrar. Nada é apagado: se mudar de novo para estúdio, ela volta.
        </p>
      )}
    </section>
  );
}
