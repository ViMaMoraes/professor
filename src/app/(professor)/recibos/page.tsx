import { FileDown, Plus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Botao, BotaoLink, Cabecalho, Card, EsqueletoPagina, Select, Tabela, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarAlunos, listarRecibos } from "@/lib/consultas";
import { dataBR, moeda, numeroRecibo } from "@/lib/formato";

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
  await exigirProfessor();
  const alunoId = Number((await searchParams).aluno) || undefined;
  const [linhas, alunos] = await Promise.all([listarRecibos(alunoId), listarAlunos({ situacao: "todos" })]);
  const total = linhas.reduce((soma, l) => soma + l.recibo.valorCentavos, 0);

  return (
    <>
      <form className="mb-4 flex gap-2">
        <Select name="aluno" defaultValue={alunoId ?? ""} className="sm:w-72">
          <option value="">Todos os alunos</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
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
                <th>Aluno</th>
                <th>Referente a</th>
                <th className="text-right!">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ recibo, aluno }) => (
                <tr key={recibo.id}>
                  <td>
                    <Link href={`/recibos/${recibo.id}`} className="font-mono text-xs text-marca-texto hover:underline">
                      #{numeroRecibo(recibo.numero)}
                    </Link>
                  </td>
                  <td className="tabular-nums">{dataBR(recibo.dataPagamento)}</td>
                  <td className="font-medium">{aluno.nome}</td>
                  <td className="text-suave">{recibo.referente}</td>
                  <td className="text-right font-medium whitespace-nowrap tabular-nums">{moeda(recibo.valorCentavos)}</td>
                  <td className="text-right">
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
