import { CalendarDays, Trash2 } from "lucide-react";
import Link from "next/link";

import { excluirReposicao } from "@/app/acoes/agenda";
import { BotaoAgendar, BotaoConceder, BotaoDesmarcar } from "@/app/(professor)/agenda/acoes-agenda";
import { BotaoAcao } from "@/components/botao-acao";
import { Card, CardTitulo, Selo } from "@/components/ui";
import { DIAS_CURTOS, diaDaSemana, rotuloCurso, type Ocorrencia } from "@/lib/agenda";
import { dataBR } from "@/lib/formato";

type Pendente = { id: number; motivo: string | null };
type ReposicaoHistorico = { id: number; data: string | null; hora: string | null; motivo: string | null };

/** Próximas aulas do aluno e reposições (a marcar e agendadas), na página do aluno. */
export function AulasAluno({
  alunoId,
  nome,
  proximas,
  pendentes,
  historico,
  hoje,
  duracaoPadrao,
  cursos = [],
}: {
  alunoId: number;
  nome: string;
  proximas: Ocorrencia[];
  pendentes: Pendente[];
  /** todas as reposições do aluno (para o histórico) */
  historico: ReposicaoHistorico[];
  hoje: string;
  duracaoPadrao: number;
  /** estúdio: cursos do aluno ("Piano com Paula"), para escolher o da reposição */
  cursos?: { id: number; rotulo: string }[];
}) {
  const comData = historico.filter((r) => r.data);
  const feitas = comData.filter((r) => r.data! < hoje).length;
  const marcadas = comData.length - feitas;
  const curto = (o: Ocorrencia) => `${DIAS_CURTOS[diaDaSemana(o.data)]} ${dataBR(o.data).slice(0, 5)}${o.hora ? ` ${o.hora}` : ""}`;
  return (
    <Card>
      <CardTitulo
        icone={<CalendarDays />}
        acao={
          <Link href="/agenda" className="text-sm text-marca-texto hover:underline">
            Agenda
          </Link>
        }
      >
        Próximas aulas e reposições
      </CardTitulo>
      {proximas.length === 0 && pendentes.length === 0 ? (
        <p className="p-5 text-sm text-suave">Sem aulas nas próximas duas semanas. Cadastre os horários em Editar.</p>
      ) : (
        <ul className="divide-y divide-borda">
          {pendentes.map((r) => (
            <li key={`p-${r.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <Selo cor="azul">reposição a marcar</Selo>
                {r.motivo && <p className="mt-1 text-xs text-suave">{r.motivo}</p>}
              </div>
              <BotaoAgendar reposicaoId={r.id} nome={nome} hoje={hoje} duracaoPadrao={duracaoPadrao} />
              <BotaoAcao
                acao={excluirReposicao.bind(null, r.id)}
                confirmar="Cancelar esta reposição?"
                sucesso="Reposição cancelada."
                variante="fantasma"
                tamanho="sm"
                aria-label="Cancelar reposição"
              >
                <Trash2 />
              </BotaoAcao>
            </li>
          ))}
          {proximas.map((o) => (
            <li key={o.chave} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-sm">
              <span className="w-28 font-mono text-xs">{curto(o)}</span>
              <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {o.curso && <span className="text-xs text-suave">{rotuloCurso(o.curso, o.professor)}</span>}
                {o.tipo === "reposicao" && <Selo cor="azul">reposição</Selo>}
                {o.desmarcada?.por === "professor" && <Selo>desmarcada</Selo>}
                {o.desmarcada?.por === "aluno" && <Selo cor="amarelo">avisou que não vem</Selo>}
              </span>
              {o.tipo === "aula" && !o.desmarcada && o.hora && (
                <BotaoDesmarcar alunoId={alunoId} nome={nome} data={o.data} hora={o.hora} quando={curto(o)} />
              )}
            </li>
          ))}
        </ul>
      )}
      {historico.length > 0 && (
        <details className="group border-t border-borda">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-sm">
            <span>
              <span className="font-medium">Reposições:</span>{" "}
              <span className="text-suave">
                {[
                  pendentes.length && `${pendentes.length} a marcar`,
                  marcadas && `${marcadas} ${marcadas === 1 ? "marcada" : "marcadas"}`,
                  feitas && `${feitas} ${feitas === 1 ? "feita" : "feitas"}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="text-xs text-marca-texto group-open:hidden">ver histórico</span>
          </summary>
          <ul className="divide-y divide-borda border-t border-borda">
            {historico.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
                <span className="w-28 font-mono text-xs">{r.data ? `${dataBR(r.data).slice(0, 5)} ${r.hora ?? ""}` : "—"}</span>
                <span className="min-w-0 flex-1 truncate text-suave">{r.motivo ?? "Reposição"}</span>
                {!r.data ? (
                  <Selo cor="azul">a marcar</Selo>
                ) : r.data < hoje ? (
                  <Selo cor="verde">feita</Selo>
                ) : (
                  <Selo>marcada</Selo>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="border-t border-borda px-5 py-3">
        <BotaoConceder alunoId={alunoId} nome={nome} rotulo="Dar reposição" cursos={cursos} />
      </div>
    </Card>
  );
}
