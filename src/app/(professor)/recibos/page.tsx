import { Building2, FileDown, Plus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Botao, BotaoLink, Cabecalho, Card, EsqueletoPagina, Select, Tabela, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarAlunos, listarInstituicoes, listarRecibos } from "@/lib/consultas";
import { dataBR, moeda, numeroRecibo } from "@/lib/formato";

import { VerRecibo } from "./ver-recibo";

export const metadata: Metadata = { title: "Recibos" };

export default function PaginaRecibos(props: PageProps<"/recibos">) {
  return (
    <>
      <Cabecalho titulo="Recibos" descricao="Recibos numerados, prontos para baixar e enviar.">
        <BotaoLink href="/recibos/novo">
          <Plus /> Novo recibo
        </BotaoLink>
      </Cabecalho>
      <Suspense fallback={<EsqueletoPagina />}>
        <Lista searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Lista({ searchParams }: { searchParams: PageProps<"/recibos">["searchParams"] }) {
  const professor = await exigirProfessor();
  const params = await searchParams;
  // filtro "pagador" = "aluno-12" ou "instituicao-3" (também aceita ?aluno=12 / ?instituicao=3)
  const [tipo, idTexto] = typeof params.pagador === "string" ? params.pagador.split("-") : [];
  const alunoId = (tipo === "aluno" ? Number(idTexto) : Number(params.aluno)) || undefined;
  const instituicaoId = (tipo === "instituicao" ? Number(idTexto) : Number(params.instituicao)) || undefined;
  const filtroAtual = alunoId ? `aluno-${alunoId}` : instituicaoId ? `instituicao-${instituicaoId}` : "";
  const [linhas, alunos, instituicoes] = await Promise.all([
    listarRecibos(professor.id, { alunoId, instituicaoId }),
    listarAlunos(professor.id, { situacao: "todos" }),
    listarInstituicoes(professor.id, { situacao: "todas" }),
  ]);
  const total = linhas.reduce((soma, l) => soma + l.recibo.valorCentavos, 0);

  return (
    <>
      <form className="mb-4 flex gap-2">
        <Select name="pagador" defaultValue={filtroAtual} className="sm:w-72">
          <option value="">Todos os recibos</option>
          {instituicoes.length > 0 && (
            <optgroup label="Instituições">
              {instituicoes.map(({ instituicao: i }) => (
                <option key={i.id} value={`instituicao-${i.id}`}>
                  {i.nome}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Alunos">
            {alunos.map((a) => (
              <option key={a.id} value={`aluno-${a.id}`}>
                {a.nome}
              </option>
            ))}
          </optgroup>
        </Select>
        <Botao variante="secundario">Filtrar</Botao>
      </form>
      <Card>
        {linhas.length === 0 ? (
          <Vazio icone={<ReceiptText />} titulo="Nenhum recibo emitido" />
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Pagador</th>
                <th>Referente a</th>
                <th className="text-right!">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ recibo, aluno, instituicao }) => (
                <tr key={recibo.id}>
                  <td>
                    <Link href={`/recibos/${recibo.id}`} className="font-mono text-xs text-marca-texto hover:underline">
                      #{numeroRecibo(recibo.numero)}
                    </Link>
                  </td>
                  <td className="tabular-nums">{dataBR(recibo.dataPagamento)}</td>
                  <td className="font-medium">
                    {instituicao ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-suave" /> {instituicao.nome}
                      </span>
                    ) : (
                      aluno?.nome
                    )}
                  </td>
                  <td className="text-suave">{recibo.referente}</td>
                  <td className="text-right font-medium whitespace-nowrap tabular-nums">{moeda(recibo.valorCentavos)}</td>
                  <td className="text-right whitespace-nowrap">
                    <VerRecibo id={recibo.id} numero={numeroRecibo(recibo.numero)} />
                    <a href={`/api/recibos/${recibo.id}?baixar=1`} className="inline-flex rounded-lg p-2 text-suave hover:bg-fundo" title="Baixar PDF">
                      <FileDown className="size-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-borda font-semibold">
                <td colSpan={4} className="text-right">
                  Total
                </td>
                <td className="text-right whitespace-nowrap tabular-nums">{moeda(total)}</td>
                <td />
              </tr>
            </tfoot>
          </Tabela>
        )}
      </Card>
    </>
  );
}
