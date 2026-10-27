import { CalendarSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SeloPresenca } from "@/components/selos";
import { Botao, Cabecalho, Campo, Card, EsqueletoPagina, Input, Select, Tabela, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { STATUS_PRESENCA } from "@/lib/constantes";
import { historicoPresencas, listarAlunos } from "@/lib/consultas";
import type { StatusPresenca } from "@/lib/db/schema";
import { dataBR, hojeISO, isoValido } from "@/lib/formato";

export const metadata: Metadata = { title: "Histórico de chamadas" };

export default function PaginaHistorico(props: PageProps<"/chamada/historico">) {
  return (
    <>
      <Cabecalho titulo="Histórico de chamadas" />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/chamada/historico">["searchParams"] }) {
  await exigirProfessor();
  const params = await searchParams;
  const hoje = hojeISO();
  const inicio = typeof params.inicio === "string" && isoValido(params.inicio) ? params.inicio : hoje.slice(0, 8) + "01";
  const fim = typeof params.fim === "string" && isoValido(params.fim) ? params.fim : hoje;
  const alunoId = Number(params.aluno) || undefined;

  const [registros, alunos] = await Promise.all([historicoPresencas(inicio, fim, alunoId), listarAlunos({ situacao: "todos" })]);
  const totais = Object.fromEntries(Object.keys(STATUS_PRESENCA).map((s) => [s, 0])) as Record<StatusPresenca, number>;
  for (const r of registros) totais[r.presenca.status]++;

  return (
    <>
      <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <Campo rotulo="De">
          <Input type="date" name="inicio" defaultValue={inicio} />
        </Campo>
        <Campo rotulo="Até">
          <Input type="date" name="fim" defaultValue={fim} />
        </Campo>
        <Campo rotulo="Aluno">
          <Select name="aluno" defaultValue={alunoId ?? ""}>
            <option value="">Todos</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
        </Campo>
        <Botao variante="secundario">Filtrar</Botao>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(STATUS_PRESENCA) as StatusPresenca[]).map((s) => (
          <Card key={s} className="flex items-center justify-between p-4">
            <SeloPresenca status={s} />
            <span className="text-2xl font-semibold tabular-nums">{totais[s]}</span>
          </Card>
        ))}
      </div>

      <Card>
        {registros.length === 0 ? (
          <Vazio icone={<CalendarSearch />} titulo="Nenhum registro no período" />
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th>Data</th>
                <th>Aluno</th>
                <th>Situação</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(({ presenca, aluno }) => (
                <tr key={presenca.id}>
                  <td className="tabular-nums">{dataBR(presenca.data)}</td>
                  <td>
                    <Link href={`/alunos/${aluno.id}`} className="hover:text-marca-texto">
                      {aluno.nome}
                    </Link>
                  </td>
                  <td>
                    <SeloPresenca status={presenca.status} />
                  </td>
                  <td className="text-suave">{presenca.observacao}</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Card>
    </>
  );
}
