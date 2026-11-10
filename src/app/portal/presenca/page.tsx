import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";

import { SeloPresenca } from "@/components/selos";
import { Card, Vazio } from "@/components/ui";
import { DIAS_CURTOS, diaDaSemana } from "@/lib/agenda";
import { exigirAlunoComProfessor } from "@/lib/auth";
import { chamadasParaOAluno } from "@/lib/consultas";
import { nomeMes } from "@/lib/financeiro";
import { dataBR } from "@/lib/formato";
import { presencaPorMes, resumoPresenca } from "@/lib/presenca";

export const metadata: Metadata = { title: "Minha presença" };

export default async function PaginaPresencaAluno() {
  const { aluno } = await exigirAlunoComProfessor();
  const registros = await chamadasParaOAluno(aluno.id);
  const geral = resumoPresenca(registros);
  const meses = presencaPorMes(registros);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Minha presença</h1>
        <p className="mt-1 text-sm text-suave">Vem da chamada que o professor faz em cada aula.</p>
      </div>

      {geral.total === 0 ? (
        <Card>
          <Vazio icone={<CalendarCheck />} titulo="Nenhuma chamada ainda">
            Quando o professor fizer a chamada das suas aulas, sua presença aparece aqui.
          </Vazio>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <p className="text-sm text-suave">Sua frequência</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums">{geral.frequencia}%</p>
                <p className="mt-1 text-xs text-suave">
                  {geral.presentes} de {geral.total} {geral.total === 1 ? "aula" : "aulas"}, contando as reposições
                </p>
              </div>
              <dl className="grid w-full min-w-0 grid-cols-2 gap-3 sm:w-auto sm:flex-1 sm:grid-cols-4">
                {(
                  [
                    ["Presenças", geral.presente, "text-emerald-600 dark:text-emerald-400"],
                    ["Reposições", geral.reposicao, "text-sky-600 dark:text-sky-400"],
                    ["Faltas justificadas", geral.justificada, "text-amber-600 dark:text-amber-400"],
                    ["Faltas", geral.falta, "text-red-600 dark:text-red-400"],
                  ] as const
                ).map(([rotulo, valor, cor]) => (
                  <div key={rotulo} className="rounded-xl bg-fundo px-3 py-2">
                    <dt className="text-xs text-suave">{rotulo}</dt>
                    <dd className={`text-xl font-semibold tabular-nums ${cor}`}>{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>

          {meses.map(({ mes, registros: doMes, resumo }) => (
            <section key={mes}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{nomeMes(mes)}</h2>
                <span className="text-xs text-suave tabular-nums">
                  {resumo.total} {resumo.total === 1 ? "aula" : "aulas"} · {resumo.frequencia}% de presença
                </span>
              </div>
              <Card>
                <ul className="divide-y divide-borda">
                  {doMes.map((r) => (
                    <li key={r.data} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
                      <span className="tabular-nums">
                        <span className="inline-block w-9 text-suave">{DIAS_CURTOS[diaDaSemana(r.data)]}</span>
                        {dataBR(r.data)}
                      </span>
                      <SeloPresenca status={r.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
