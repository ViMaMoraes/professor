import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, Trash2, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { desagendarReposicao, desfazerDesmarcada, excluirReposicao } from "@/app/acoes/agenda";
import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { BotaoAcao } from "@/components/botao-acao";
import { BotaoLink, Cabecalho, Card, CardTitulo, cn, EsqueletoPagina, Selo } from "@/components/ui";
import { agoraBrasilia, DIAS_LONGOS, diaDaSemana, inicioDaSemana, somarDiasAgenda, type Ocorrencia } from "@/lib/agenda";
import { exigirProfessor } from "@/lib/auth";
import { agendaDoPeriodo, reposicoesPendentes } from "@/lib/consultas";
import { dataBR, isoValido } from "@/lib/formato";
import { chavePublicaVapid } from "@/lib/push";

import { BotaoAgendar, BotaoConceder, BotaoDesmarcar } from "./acoes-agenda";

export const metadata: Metadata = { title: "Agenda" };

export default function PaginaAgenda(props: PageProps<"/agenda">) {
  return (
    <>
      <Cabecalho titulo="Agenda" descricao="Aulas da semana, reposições e aulas desmarcadas. A reposição só existe quando você concede." />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

const diaMes = (data: string) => dataBR(data).slice(0, 5);
const quando = (o: Pick<Ocorrencia, "data" | "hora">) => `${DIAS_LONGOS[diaDaSemana(o.data)].toLowerCase()}, ${diaMes(o.data)}${o.hora ? ` às ${o.hora}` : ""}`;

async function Conteudo({ searchParams }: { searchParams: PageProps<"/agenda">["searchParams"] }) {
  const professor = await exigirProfessor();
  const params = await searchParams;
  const hoje = agoraBrasilia().data;
  const segunda = inicioDaSemana(typeof params.semana === "string" && isoValido(params.semana) ? params.semana : hoje);
  const domingo = somarDiasAgenda(segunda, 6);
  const [agenda, pendentes] = await Promise.all([agendaDoPeriodo(professor, segunda, domingo), reposicoesPendentes(professor.id)]);
  const dias = Array.from({ length: 7 }, (_, i) => somarDiasAgenda(segunda, i));
  const chavePublica = chavePublicaVapid();

  return (
    <>
      {pendentes.length > 0 && (
        <Card className="mb-6">
          <CardTitulo icone={<RotateCcw />}>Reposições a marcar ({pendentes.length})</CardTitulo>
          <ul className="divide-y divide-borda">
            {pendentes.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={`/alunos/${r.alunoId}`} className="font-medium hover:text-marca-texto">
                    {r.nome}
                  </Link>
                  {r.motivo && <p className="text-xs text-suave">{r.motivo}</p>}
                </div>
                <BotaoAgendar reposicaoId={r.id} nome={r.nome} hoje={hoje} duracaoPadrao={professor.duracaoAula} />
                <BotaoAcao
                  acao={excluirReposicao.bind(null, r.id)}
                  confirmar={`Cancelar a reposição de ${r.nome}?`}
                  detalhe="O aluno deixa de ter esta reposição."
                  sucesso="Reposição cancelada."
                  variante="fantasma"
                  tamanho="sm"
                  aria-label="Cancelar reposição"
                  title="Cancelar reposição"
                >
                  <Trash2 />
                </BotaoAcao>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <BotaoLink href={`/agenda?semana=${somarDiasAgenda(segunda, -7)}`} variante="secundario" tamanho="icone" aria-label="Semana anterior">
          <ChevronLeft />
        </BotaoLink>
        <div className="text-center">
          <p className="font-semibold">
            {diaMes(segunda)} a {diaMes(domingo)}
          </p>
          {!dias.includes(hoje) && (
            <Link href="/agenda" className="text-xs text-marca-texto hover:underline">
              Voltar para esta semana
            </Link>
          )}
        </div>
        <BotaoLink href={`/agenda?semana=${somarDiasAgenda(segunda, 7)}`} variante="secundario" tamanho="icone" aria-label="Próxima semana">
          <ChevronRight />
        </BotaoLink>
      </div>

      <div className="space-y-4">
        {dias.map((dia) => {
          const doDia = agenda.filter((o) => o.data === dia);
          return (
            <Card key={dia} className={cn(dia === hoje && "border-marca")}>
              <div className="flex items-center justify-between gap-2 border-b border-borda px-5 py-3">
                <h2 className="font-semibold">
                  {DIAS_LONGOS[diaDaSemana(dia)]} <span className="font-normal text-suave">{diaMes(dia)}</span>
                </h2>
                {dia === hoje && <Selo cor="marca">hoje</Selo>}
              </div>
              {doDia.length === 0 ? (
                <p className="px-5 py-3 text-sm text-suave">Sem aulas.</p>
              ) : (
                <ul className="divide-y divide-borda">
                  {doDia.map((o) => (
                    <Aula key={o.chave} aula={o} hoje={hoje} duracaoPadrao={professor.duracaoAula} />
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      {agenda.length === 0 && pendentes.length === 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-suave">
          <CalendarDays className="size-4" /> Cadastre os horários de aula no cadastro de cada aluno para eles aparecerem aqui.
        </p>
      )}

      {chavePublica && (
        <div className="mt-6">
          <AtivarNotificacoes
            chavePublica={chavePublica}
            titulo="Receba no celular os avisos das aulas"
            motivo="das aulas do dia, de manhã, e quando um aluno avisar que não vai"
          />
        </div>
      )}
    </>
  );
}

function Aula({ aula: o, hoje, duracaoPadrao }: { aula: Ocorrencia; hoje: string; duracaoPadrao: number }) {
  const passou = o.data < hoje;
  return (
    <li className={cn("flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center", o.desmarcada && "opacity-70")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={cn("w-12 shrink-0 font-mono text-sm", o.desmarcada && "line-through")}>{o.hora ?? "—"}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <Link href={`/alunos/${o.alunoId}`} className={cn("truncate font-medium hover:text-marca-texto", o.desmarcada && "line-through")}>
              {o.nome}
            </Link>
            {o.tipo === "reposicao" && <Selo cor="azul">reposição</Selo>}
            {o.desmarcada?.por === "professor" && <Selo>desmarcada</Selo>}
            {o.desmarcada?.por === "aluno" && <Selo cor="amarelo">avisou que não vem</Selo>}
            {!o.hora && <Selo>horário a definir</Selo>}
          </p>
          <p className="text-xs text-suave">
            {o.duracaoMin} min
            {o.desmarcada?.motivo && ` · ${o.desmarcada.motivo}`}
            {o.reposicao?.motivo && ` · ${o.reposicao.motivo}`}
          </p>
        </div>
      </div>
      {!passou && (
        <div className="flex shrink-0 flex-wrap gap-2 pl-15 sm:pl-0">
          {o.tipo === "aula" && !o.desmarcada && (
            <BotaoDesmarcar alunoId={o.alunoId} nome={o.nome} data={o.data} hora={o.hora ?? ""} quando={quando(o)} />
          )}
          {o.desmarcada && (
            <>
              {o.desmarcada.por === "aluno" && (
                <BotaoConceder alunoId={o.alunoId} nome={o.nome} motivo={`Falta avisada em ${diaMes(o.data)}`} />
              )}
              <BotaoAcao
                acao={desfazerDesmarcada.bind(null, o.desmarcada.id)}
                confirmar="A aula volta a acontecer?"
                detalhe={o.desmarcada.por === "professor" ? "A reposição gerada (se houver) continua; dá para cancelar em “Reposições a marcar”." : undefined}
                sucesso="Aula remarcada."
                variante="fantasma"
                tamanho="sm"
              >
                <Undo2 /> Desfazer
              </BotaoAcao>
            </>
          )}
          {o.reposicao && (
            <>
              <BotaoAgendar
                reposicaoId={o.reposicao.id}
                nome={o.nome}
                hoje={hoje}
                data={o.data}
                hora={o.hora}
                duracaoMin={o.reposicao.duracaoMin}
                duracaoPadrao={duracaoPadrao}
                remarcar
              />
              <BotaoAcao
                acao={desagendarReposicao.bind(null, o.reposicao.id)}
                confirmar="Tirar a data desta reposição?"
                detalhe="Ela volta para “Reposições a marcar”."
                sucesso="Reposição sem data."
                variante="fantasma"
                tamanho="sm"
              >
                <Undo2 /> Tirar data
              </BotaoAcao>
            </>
          )}
        </div>
      )}
    </li>
  );
}
