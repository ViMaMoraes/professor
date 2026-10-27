"use client";

import { Building2, ReceiptText, User } from "lucide-react";
import { useState } from "react";

import { criarRecibo } from "@/app/acoes/recibos";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, cn, Input, Select } from "@/components/ui";
import { FORMAS_PAGAMENTO } from "@/lib/constantes";
import { centavosParaCampo } from "@/lib/formato";

type AlunoOpcao = { id: number; nome: string; mensalidade: number | null };
type InstituicaoOpcao = { id: number; nome: string; mensalidade: number | null; alunos: string[] };
type Tipo = "aluno" | "instituicao";

/** Texto "referente a" de um recibo de instituição, já com os alunos atendidos. */
function referenteInstituicao(padrao: string, instituicao?: InstituicaoOpcao) {
  if (!instituicao?.alunos.length) return padrao;
  return `${padrao} - alunos: ${instituicao.alunos.join(", ")}`;
}

export function FormRecibo({
  alunos,
  instituicoes,
  alunoInicial,
  instituicaoInicial,
  hoje,
  referentePadrao,
}: {
  alunos: AlunoOpcao[];
  instituicoes: InstituicaoOpcao[];
  alunoInicial?: number;
  instituicaoInicial?: number;
  hoje: string;
  referentePadrao: string;
}) {
  const [tipo, setTipo] = useState<Tipo>(instituicaoInicial || alunos.length === 0 ? "instituicao" : "aluno");
  const [alunoId, setAlunoId] = useState(alunoInicial ? String(alunoInicial) : "");
  const [instituicaoId, setInstituicaoId] = useState(instituicaoInicial ? String(instituicaoInicial) : "");
  const instituicao = (id: string) => instituicoes.find((i) => String(i.id) === id);
  const [valor, setValor] = useState(() =>
    centavosParaCampo(
      instituicaoInicial ? instituicao(String(instituicaoInicial))?.mensalidade : alunos.find((a) => a.id === alunoInicial)?.mensalidade,
    ),
  );
  const [referente, setReferente] = useState(() =>
    instituicaoInicial ? referenteInstituicao(referentePadrao, instituicao(String(instituicaoInicial))) : referentePadrao,
  );

  function trocarTipo(novo: Tipo) {
    setTipo(novo);
    setValor("");
    setReferente(novo === "instituicao" ? referenteInstituicao(referentePadrao, instituicao(instituicaoId)) : referentePadrao);
  }

  return (
    <Formulario acao={criarRecibo}>
      <input type="hidden" name="tipo" value={tipo} />
      <Card className="grid gap-4 p-5 sm:grid-cols-4">
        <fieldset className="sm:col-span-4">
          <legend className="mb-2 text-sm font-medium">Recibo para</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { valor: "aluno" as const, titulo: "Um aluno", desc: "O aluno (ou o responsável) que pagou.", Icone: User },
              {
                valor: "instituicao" as const,
                titulo: "Uma instituição",
                desc: "Escola, igreja, projeto ou família que paga por vários alunos.",
                Icone: Building2,
              },
            ].map(({ valor: v, titulo, desc, Icone }) => (
              <button
                key={v}
                type="button"
                onClick={() => trocarTipo(v)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-borda p-3 text-left transition-colors",
                  tipo === v ? "border-marca bg-marca-suave/40" : "hover:bg-fundo",
                )}
                aria-pressed={tipo === v}
              >
                <Icone className={cn("mt-0.5 size-4", tipo === v ? "text-marca-texto" : "text-suave")} />
                <span>
                  <span className="block text-sm font-medium">{titulo}</span>
                  <span className="text-xs text-suave">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {tipo === "aluno" ? (
          <Campo rotulo="Aluno *" className="sm:col-span-2">
            <Select
              name="alunoId"
              required
              value={alunoId}
              onChange={(e) => {
                setAlunoId(e.target.value);
                const v = centavosParaCampo(alunos.find((a) => String(a.id) === e.target.value)?.mensalidade);
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
        ) : (
          <Campo
            rotulo="Instituição *"
            className="sm:col-span-2"
            dica={instituicoes.length === 0 ? "Nenhuma instituição cadastrada ainda. Cadastre em Instituições." : undefined}
          >
            <Select
              name="instituicaoId"
              required
              value={instituicaoId}
              onChange={(e) => {
                setInstituicaoId(e.target.value);
                const escolhida = instituicao(e.target.value);
                const v = centavosParaCampo(escolhida?.mensalidade);
                if (v) setValor(v);
                setReferente(referenteInstituicao(referentePadrao, escolhida));
              }}
            >
              <option value="">Selecione...</option>
              {instituicoes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </Select>
          </Campo>
        )}
        <Campo rotulo="Valor (R$) *">
          <Input name="valor" inputMode="decimal" required placeholder="150,00" value={valor} onChange={(e) => setValor(e.target.value)} />
        </Campo>
        <Campo rotulo="Data do pagamento *">
          <Input type="date" name="dataPagamento" required defaultValue={hoje} />
        </Campo>
        <Campo rotulo="Referente a *" className="sm:col-span-3">
          <Input name="referente" required value={referente} onChange={(e) => setReferente(e.target.value)} />
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
