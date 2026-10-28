"use client";

import { Check, Search } from "lucide-react";
import { useState } from "react";

import { salvarInstituicao } from "@/app/acoes/instituicoes";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, cn, Input, Select, Textarea } from "@/components/ui";
import type { Instituicao } from "@/lib/db/schema";
import { centavosParaCampo } from "@/lib/formato";

type AlunoOpcao = { id: number; nome: string; instrumento: string | null; outraInstituicao: string | null; marcado: boolean };

type Props = { instituicao?: Instituicao; alunos: AlunoOpcao[] };

export function FormInstituicao(props: Props) {
  // muda a cada "cadastrar outra": recria o formulário vazio
  const [versao, setVersao] = useState(0);
  return <CamposInstituicao key={versao} {...props} limpar={() => setVersao((v) => v + 1)} />;
}

function CamposInstituicao({ instituicao, alunos, limpar }: Props & { limpar: () => void }) {
  const [filtro, setFiltro] = useState("");
  const acao = salvarInstituicao.bind(null, instituicao?.id ?? null);

  return (
    <Formulario acao={acao} cadastrarOutro={instituicao ? undefined : { lista: "/instituicoes", limpar, pergunta: "Deseja cadastrar outra?" }}>
      <input type="hidden" name="atualizarAlunos" value="1" />
      <Card className="divide-y divide-borda">
        <section className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="font-semibold sm:col-span-2 lg:col-span-3">Dados da instituição</h2>
          <Campo rotulo="Nome *" className="sm:col-span-2">
            <Input name="nome" required defaultValue={instituicao?.nome} placeholder="Ex.: Escola Municipal Villa-Lobos" />
          </Campo>
          <Campo rotulo="CNPJ ou CPF" dica="Aparece no recibo.">
            <Input name="documento" defaultValue={instituicao?.documento ?? ""} />
          </Campo>
          <Campo rotulo="Pessoa de contato">
            <Input name="contato" defaultValue={instituicao?.contato ?? ""} placeholder="Ex.: Coordenadora Ana" />
          </Campo>
          <Campo rotulo="Telefone / WhatsApp">
            <Input name="telefone" defaultValue={instituicao?.telefone ?? ""} />
          </Campo>
          <Campo rotulo="E-mail">
            <Input type="email" name="email" defaultValue={instituicao?.email ?? ""} />
          </Campo>
          <Campo rotulo="Endereço" className="sm:col-span-2">
            <Input name="endereco" defaultValue={instituicao?.endereco ?? ""} />
          </Campo>
          <Campo rotulo="Valor mensal (R$)" dica="Sugerido ao gerar o recibo.">
            <Input
              name="valorMensal"
              inputMode="decimal"
              placeholder="1.200,00"
              defaultValue={centavosParaCampo(instituicao?.valorMensalCentavos)}
            />
          </Campo>
          <Campo rotulo="Tratamento no recibo" dica="“recebi da Igreja…”, “recebi do Colégio…”">
            <Select name="tratamento" defaultValue={instituicao?.tratamento ?? "da"}>
              <option value="da">da</option>
              <option value="do">do</option>
              <option value="de">de</option>
            </Select>
          </Campo>
          <Campo rotulo="Descrição do pagamento (recibo)" dica="Ex.: “às aulas de violino”. Vem preenchida ao gerar o recibo." className="sm:col-span-2">
            <Input name="descricaoRecibo" placeholder="às aulas de violino" defaultValue={instituicao?.descricaoRecibo ?? ""} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2 lg:col-span-3">
            <Textarea name="observacoes" rows={2} defaultValue={instituicao?.observacoes ?? ""} placeholder="Contrato, horários, turma..." />
          </Campo>
        </section>

        <section className="p-5">
          <h2 className="font-semibold">Alunos desta instituição</h2>
          <p className="mt-0.5 mb-3 text-sm text-suave">
            A chamada continua sendo de cada aluno; aqui você só diz quem é atendido (e pago) por esta instituição.
          </p>
          <div className="rounded-xl border border-borda">
            <div className="relative border-b border-borda p-2">
              <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-suave" />
              <Input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar alunos..." className="h-9 border-0 pl-9 shadow-none" />
            </div>
            <div className="grid max-h-72 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
              {alunos.length === 0 && <p className="p-2 text-sm text-suave">Nenhum aluno cadastrado ainda.</p>}
              {alunos.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-fundo",
                    !a.nome.toLowerCase().includes(filtro.toLowerCase()) && "hidden",
                  )}
                >
                  <input type="checkbox" name="alunos" value={a.id} defaultChecked={a.marcado} className="size-4 accent-marca" />
                  <span className="min-w-0">
                    {a.nome} {a.instrumento && <span className="text-xs text-suave">{a.instrumento}</span>}
                    {a.outraInstituicao && <span className="block text-xs text-amber-600">hoje em: {a.outraInstituicao}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <div className="flex gap-2 p-5">
          <BotaoEnviar>
            <Check /> Salvar
          </BotaoEnviar>
          <BotaoLink href={instituicao ? `/instituicoes/${instituicao.id}` : "/instituicoes"} variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}
