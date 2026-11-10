import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, Trash2, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { desagendarReposicao, desfazerDesmarcada, excluirReposicao } from "@/app/acoes/agenda";
import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { BotaoAcao } from "@/components/botao-acao";
import { BotaoLink, Cabecalho, Card, CardTitulo, cn, EsqueletoPagina, Selo } from "@/components/ui";
import { agoraBrasilia, DIAS_LONGOS, diaDaSemana, inicioDaSemana, somarDiasAgenda, type Ocorrencia } from "@/lib/agenda";
import { exigirAcesso } from "@/lib/auth";
import { agendaDoPeriodo, reposicoesPendentes } from "@/lib/consultas";
import { mesValido, nomeMes, somarMeses } from "@/lib/financeiro";
import { dataBR, isoValido } from "@/lib/formato";
import { chavePublicaVapid } from "@/lib/push";

import { BotaoAgendar, BotaoConceder, BotaoDesmarcar } from "./acoes-agenda";

export const metadata: Metadata = { title: "Agenda" };

export default function PaginaAgenda(props: PageProps<"/agenda">) {
  return (
    <>
      <Cabecalho titulo="Agenda" descricao="Calendário das aulas, reposições e aulas desmarcadas. Toque num dia para ver e agir. A reposição só existe quando você concede." />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

const diaMes = (data: string) => dataBR(data).slice(0, 5);
const quando = (o: Pick<Ocorrencia, "data" | "hora">) =>
  `${DIAS_LONGOS[diaDaSemana(o.data)].toLowerCase()}, ${diaMes(o.data)}${o.hora ? ` às ${o.hora}` : ""}`;

async function Conteudo({ searchParams }: { searchParams: PageProps<"/agenda">["searchParams"] }) {
  const { professor, membro } = await exigirAcesso("agenda");
  const params = await searchParams;
  const hoje = agoraBrasilia().data;
  // duas visões: calendário do mês (padrão) e lista da semana
  const visao = params.visao === "semana" ? "semana" : "mes";
  const mes = mesValido(params.mes)
    ? params.mes
    : (typeof params.dia === "string" && isoValido(params.dia) ? params.dia : hoje).slice(0, 7);
  const diaEscolhido =
    typeof params.dia === "string" && isoValido(params.dia) && params.dia.startsWith(mes)
      ? params.dia
      : hoje.startsWith(mes)
        ? hoje
        : `${mes}-01`;
  const segunda = inicioDaSemana(typeof params.semana === "string" && isoValido(params.semana) ? params.semana : hoje);
  const domingo = somarDiasAgenda(segunda, 6);
  // grade do mês: da segunda da 1ª semana ao domingo da última
  const primeiroDia = inicioDaSemana(`${mes}-01`);
  const ultimoDia = somarDiasAgenda(inicioDaSemana(somarDiasAgenda(`${somarMeses(mes, 1)}-01`, -1)), 6);
  const [agenda, pendentes] = await Promise.all([
    visao === "mes" ? agendaDoPeriodo(professor, primeiroDia, ultimoDia) : agendaDoPeriodo(professor, segunda, domingo),
    reposicoesPendentes(professor),
  ]);
  const dias = Array.from({ length: 7 }, (_, i) => somarDiasAgenda(segunda, i));
  // as notificações no celular ainda são só do dono da conta (não da equipe)
  const chavePublica = membro ? null : chavePublicaVapid();

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

      <div className="mb-4 flex gap-1 rounded-xl bg-fundo p-1 sm:w-fit" role="tablist">
        {[
          {
            valor: "mes",
            nome: "Mês",
            href: `/agenda?mes=${(visao === "semana" ? segunda : diaEscolhido).slice(0, 7)}&dia=${visao === "semana" ? segunda : diaEscolhido}`,
          },
          { valor: "semana", nome: "Semana", href: `/agenda?visao=semana&semana=${visao === "semana" ? segunda : diaEscolhido}` },
        ].map((v) => (
          <Link
            key={v.valor}
            href={v.href}
            role="tab"
            aria-selected={visao === v.valor}
            className={cn(
              "flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-medium sm:flex-none",
              visao === v.valor ? "bg-superficie shadow-sm" : "text-suave hover:text-texto",
            )}
          >
            {v.nome}
          </Link>
        ))}
      </div>

      {visao === "mes" ? (
        <Calendario
          mes={mes}
          dias={Array.from({ length: (Date.parse(ultimoDia) - Date.parse(primeiroDia)) / 86_400_000 + 1 }, (_, i) =>
            somarDiasAgenda(primeiroDia, i),
          )}
          agenda={agenda}
          hoje={hoje}
          escolhido={diaEscolhido}
          duracaoPadrao={professor.duracaoAula}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <BotaoLink
              href={`/agenda?visao=semana&semana=${somarDiasAgenda(segunda, -7)}`}
              variante="secundario"
              tamanho="icone"
              aria-label="Semana anterior"
            >
              <ChevronLeft />
            </BotaoLink>
            <div className="text-center">
              <p className="font-semibold">
                {diaMes(segunda)} a {diaMes(domingo)}
              </p>
              {!dias.includes(hoje) && (
                <Link href="/agenda?visao=semana" className="text-xs text-marca-texto hover:underline">
                  Voltar para esta semana
                </Link>
              )}
            </div>
            <BotaoLink
              href={`/agenda?visao=semana&semana=${somarDiasAgenda(segunda, 7)}`}
              variante="secundario"
              tamanho="icone"
              aria-label="Próxima semana"
            >
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
        </>
      )}

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

const DIAS_GRADE = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Cor de cada aula no calendário: normal, reposição, aluno avisou, desmarcada. */
function estiloAula(o: Ocorrencia) {
  if (o.desmarcada?.por === "professor") return { ponto: "bg-suave/40", etiqueta: "bg-fundo text-suave line-through" };
  if (o.desmarcada?.por === "aluno")
    return { ponto: "bg-amber-500", etiqueta: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200" };
  if (o.tipo === "reposicao") return { ponto: "bg-sky-500", etiqueta: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" };
  return { ponto: "bg-marca", etiqueta: "bg-marca-suave text-marca-texto" };
}

function Calendario({
  mes,
  dias,
  agenda,
  hoje,
  escolhido,
  duracaoPadrao,
}: {
  mes: string;
  dias: string[];
  agenda: Ocorrencia[];
  hoje: string;
  escolhido: string;
  duracaoPadrao: number;
}) {
  const porDia = Map.groupBy(agenda, (o) => o.data);
  const doDia = porDia.get(escolhido) ?? [];
  const link = (m: string, d?: string) => `/agenda?mes=${m}${d ? `&dia=${d}` : ""}`;
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <BotaoLink href={link(somarMeses(mes, -1))} variante="secundario" tamanho="icone" aria-label="Mês anterior">
            <ChevronLeft />
          </BotaoLink>
          <div className="text-center">
            <p className="font-semibold">{nomeMes(mes)}</p>
            {!hoje.startsWith(mes) && (
              <Link href={link(hoje.slice(0, 7), hoje)} className="text-xs text-marca-texto hover:underline">
                Hoje
              </Link>
            )}
          </div>
          <BotaoLink href={link(somarMeses(mes, 1))} variante="secundario" tamanho="icone" aria-label="Próximo mês">
            <ChevronRight />
          </BotaoLink>
        </div>
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-borda bg-fundo text-center text-xs font-medium text-suave">
            {DIAS_GRADE.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 [&>a:nth-child(7n)]:border-r-0">
            {dias.map((dia) => {
              const aulas = porDia.get(dia) ?? [];
              const ativas = aulas.filter((o) => !o.desmarcada).length;
              return (
                <Link
                  key={dia}
                  href={`${link(mes, dia)}#dia`}
                  aria-label={`${dataBR(dia)}: ${ativas} ${ativas === 1 ? "aula" : "aulas"}`}
                  aria-current={dia === escolhido ? "date" : undefined}
                  className={cn(
                    "flex min-h-16 min-w-0 flex-col gap-1 border-r border-b border-borda p-1 transition-colors hover:bg-fundo sm:min-h-24 sm:p-1.5",
                    !dia.startsWith(mes) && "bg-fundo/50 text-suave/60",
                    dia === escolhido && "bg-marca-suave/60 ring-2 ring-marca ring-inset",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      dia === hoje && "bg-marca font-semibold text-marca-contraste",
                    )}
                  >
                    {Number(dia.slice(8))}
                  </span>
                  {/* celular: bolinhas; computador: etiquetas com hora e nome */}
                  {aulas.length > 0 && (
                    <span className="flex flex-wrap items-center gap-0.5 sm:hidden">
                      {aulas.slice(0, 4).map((o) => (
                        <span key={o.chave} className={cn("size-1.5 rounded-full", estiloAula(o).ponto)} />
                      ))}
                      {aulas.length > 4 && <span className="text-[10px] leading-none text-suave">+{aulas.length - 4}</span>}
                    </span>
                  )}
                  <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                    {aulas.slice(0, 3).map((o) => (
                      <span key={o.chave} className={cn("truncate rounded px-1 py-0.5 text-[11px] leading-tight", estiloAula(o).etiqueta)}>
                        {o.hora ?? "--:--"} {o.nome.split(" ")[0]}
                      </span>
                    ))}
                    {aulas.length > 3 && <span className="px-1 text-[11px] text-suave">+{aulas.length - 3} mais</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
          {[
            ["bg-marca", "aula"],
            ["bg-sky-500", "reposição"],
            ["bg-amber-500", "avisou que não vem"],
            ["bg-suave/40", "desmarcada"],
          ].map(([cor, nome]) => (
            <span key={nome} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", cor)} /> {nome}
            </span>
          ))}
        </div>
      </div>

      <Card id="dia" className="scroll-mt-20 self-start lg:col-span-2">
        <div className="flex items-center justify-between gap-2 border-b border-borda px-5 py-3">
          <h2 className="font-semibold">
            {DIAS_LONGOS[diaDaSemana(escolhido)]} <span className="font-normal text-suave">{diaMes(escolhido)}</span>
          </h2>
          {escolhido === hoje && <Selo cor="marca">hoje</Selo>}
        </div>
        {doDia.length === 0 ? (
          <p className="px-5 py-4 text-sm text-suave">Sem aulas neste dia.</p>
        ) : (
          <ul className="divide-y divide-borda">
            {doDia.map((o) => (
              <Aula key={o.chave} aula={o} hoje={hoje} duracaoPadrao={duracaoPadrao} compacta />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Uma aula da lista; `compacta` (painel do dia ao lado do calendário) põe os botões embaixo do nome. */
function Aula({ aula: o, hoje, duracaoPadrao, compacta = false }: { aula: Ocorrencia; hoje: string; duracaoPadrao: number; compacta?: boolean }) {
  const passou = o.data < hoje;
  return (
    <li className={cn("flex flex-col gap-2 px-5 py-3", !compacta && "sm:flex-row sm:items-center", o.desmarcada && "opacity-70")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={cn("w-12 shrink-0 font-mono text-sm", o.desmarcada && "line-through")}>{o.hora ?? "—"}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <Link
              href={`/alunos/${o.alunoId}`}
              className={cn("truncate font-medium hover:text-marca-texto", o.desmarcada && "line-through")}
            >
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
        <div className={cn("flex shrink-0 flex-wrap gap-2 pl-15", !compacta && "sm:pl-0")}>
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
                detalhe={
                  o.desmarcada.por === "professor"
                    ? "A reposição gerada (se houver) continua; dá para cancelar em “Reposições a marcar”."
                    : undefined
                }
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
