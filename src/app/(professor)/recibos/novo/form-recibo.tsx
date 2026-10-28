"use client";

import { Building2, ReceiptText, User } from "lucide-react";
import { useState } from "react";

import { salvarRecibo } from "@/app/acoes/recibos";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, cn, Input, Select } from "@/components/ui";
import { FORMAS_PAGAMENTO } from "@/lib/constantes";
import { centavosParaCampo } from "@/lib/formato";

// "descricao" vem do cadastro do aluno/instituição (ex.: "às aulas de violino")
type Opcao = { id: number; nome: string; mensalidade: number | null; descricao: string | null };
type Tipo = "aluno" | "instituicao";
/** Recibo já emitido, para editar. */
export type ReciboEditavel = {
  id: number;
  alunoId: number | null;
  instituicaoId: number | null;
  valorCentavos: number;
  dataPagamento: string;
  referente: string;
  formaPagamento: string | null;
  observacoes: string | null;
};

export function FormRecibo({
  alunos,
  instituicoes,
  alunoInicial,
  instituicaoInicial,
  hoje,
  referentePadrao,
  recibo,
}: {
  alunos: Opcao[];
  instituicoes: Opcao[];
  alunoInicial?: number;
  instituicaoInicial?: number;
  hoje: string;
  referentePadrao: string;
  recibo?: ReciboEditavel;
}) {
  // editando: começa com o pagador do recibo
  const alunoIni = recibo ? (recibo.alunoId ?? undefined) : alunoInicial;
  const instituicaoIni = recibo ? (recibo.instituicaoId ?? undefined) : instituicaoInicial;
  const [tipo, setTipo] = useState<Tipo>(instituicaoIni || alunos.length === 0 ? "instituicao" : "aluno");
  const [alunoId, setAlunoId] = useState(alunoIni ? String(alunoIni) : "");
  const [instituicaoId, setInstituicaoId] = useState(instituicaoIni ? String(instituicaoIni) : "");
  const achar = (lista: Opcao[], id: string | number | undefined) => lista.find((o) => String(o.id) === String(id));
  const inicial = instituicaoIni ? achar(instituicoes, instituicaoIni) : achar(alunos, alunoIni);
  const [valor, setValor] = useState(() => centavosParaCampo(recibo ? recibo.valorCentavos : inicial?.mensalidade));
  const [referente, setReferente] = useState(() => recibo?.referente || inicial?.descricao || referentePadrao);

  /** Ao escolher aluno/instituição, traz o valor e a descrição do cadastro. */
  function preencher(escolhido: Opcao | undefined) {
    const v = centavosParaCampo(escolhido?.mensalidade);
    if (v) setValor(v);
    setReferente(escolhido?.descricao || referentePadrao);
  }

  function trocarTipo(novo: Tipo) {
    setTipo(novo);
    setValor("");
    preencher(novo === "instituicao" ? achar(instituicoes, instituicaoId) : achar(alunos, alunoId));
  }

  return (
    <Formulario acao={salvarRecibo.bind(null, recibo?.id ?? null)}>
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
                preencher(achar(alunos, e.target.value));
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
                preencher(achar(instituicoes, e.target.value));
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
          <Input type="date" name="dataPagamento" required defaultValue={recibo?.dataPagamento ?? hoje} />
        </Campo>
        <Campo rotulo="Referente *" dica="Ex.: “às aulas de violino” (sai: “…referente às aulas de violino.”)" className="sm:col-span-3">
          <Input name="referente" required value={referente} onChange={(e) => setReferente(e.target.value)} />
        </Campo>
        <Campo rotulo="Forma de pagamento">
          <Select name="formaPagamento" defaultValue={recibo ? (recibo.formaPagamento ?? "") : "Pix"}>
            {recibo && <option value="">—</option>}
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Observações" dica="Opcional. Aparece no recibo." className="sm:col-span-4">
          <Input name="observacoes" defaultValue={recibo?.observacoes ?? ""} />
        </Campo>
        <div className="flex gap-2 sm:col-span-4">
          <BotaoEnviar>
            <ReceiptText /> {recibo ? "Salvar alterações" : "Gerar recibo"}
          </BotaoEnviar>
          <BotaoLink href={recibo ? `/recibos/${recibo.id}` : "/recibos"} variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}
