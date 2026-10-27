"use client";

import { ReceiptText } from "lucide-react";
import { useState } from "react";

import { criarRecibo } from "@/app/acoes/recibos";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, Input, Select } from "@/components/ui";
import { FORMAS_PAGAMENTO } from "@/lib/constantes";
import { centavosParaCampo } from "@/lib/formato";

type AlunoOpcao = { id: number; nome: string; mensalidade: number | null };

export function FormRecibo({
  alunos,
  alunoInicial,
  hoje,
  referentePadrao,
}: {
  alunos: AlunoOpcao[];
  alunoInicial?: number;
  hoje: string;
  referentePadrao: string;
}) {
  const mensalidade = (id?: number) => centavosParaCampo(alunos.find((a) => a.id === id)?.mensalidade);
  const [valor, setValor] = useState(mensalidade(alunoInicial));

  return (
    <Formulario acao={criarRecibo}>
      <Card className="grid gap-4 p-5 sm:grid-cols-4">
        <Campo rotulo="Aluno *" className="sm:col-span-2">
          <Select
            name="alunoId"
            required
            defaultValue={alunoInicial ?? ""}
            onChange={(e) => {
              const v = mensalidade(Number(e.target.value));
              if (v) setValor(v);
            }}
          >
            <option value="">Selecione...</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Valor (R$) *">
          <Input name="valor" inputMode="decimal" required placeholder="150,00" value={valor} onChange={(e) => setValor(e.target.value)} />
        </Campo>
        <Campo rotulo="Data do pagamento *">
          <Input type="date" name="dataPagamento" required defaultValue={hoje} />
        </Campo>
        <Campo rotulo="Referente a *" className="sm:col-span-3">
          <Input name="referente" required defaultValue={referentePadrao} />
        </Campo>
        <Campo rotulo="Forma de pagamento">
          <Select name="formaPagamento" defaultValue="Pix">
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Observações" dica="Opcional. Aparece no recibo." className="sm:col-span-4">
          <Input name="observacoes" />
        </Campo>
        <div className="flex gap-2 sm:col-span-4">
          <BotaoEnviar>
            <ReceiptText /> Gerar recibo
          </BotaoEnviar>
          <BotaoLink href="/recibos" variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}
