import { ChevronLeft, ChevronRight, CircleCheckBig, CloudDownload, ReceiptText, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { SeloPresenca } from "@/components/selos";
import { BotaoLink, Card, CardTitulo, cn, Esqueleto, Selo } from "@/components/ui";
import { agoraBrasilia, DIAS_LONGOS, diaDaSemana, somarDiasAgenda, rotuloCurso } from "@/lib/agenda";
import { exigirAcesso } from "@/lib/auth";
import { filtroDeAlunos, podeVer } from "@/lib/permissoes";
import { resumoCobranca } from "@/lib/cobranca";
import { DIAS_SEMANA } from "@/lib/constantes";
import { agendaDoPeriodo, listarRecibos, presencasNaData, recebidoPorMes, resumoPainel } from "@/lib/consultas";
import { dataBR, hojeISO, isoValido, MESES, moeda, numeroRecibo, primeiroNome } from "@/lib/formato";

export const metadata: Metadata = { title: "Painel" };

export default function PaginaPainel(props: PageProps<"/painel">) {
  return (
    <Suspense fallback={<EsqueletoPainel />}>
      <Painel searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Painel({ searchParams }: { searchParams: PageProps<"/painel">["searchParams"] }) {
  const { professor, membro, acesso } = await exigirAcesso();
  // a equipe de um estúdio só vê o que o dono liberou: sem financeiro, nada de valores no painel
  const ver = {
    alunos: podeVer(acesso, "alunos"),
    chamada: podeVer(acesso, "chamada"),
    financeiro: podeVer(acesso, "financeiro"),
    recibos: podeVer(acesso, "recibos"),
    materiais: podeVer(acesso, "materiais"),
  };
  const hoje = hojeISO();
  const diaSemana = DIAS_SEMANA[new Date(`${hoje}T12:00:00Z`).getUTCDay()];
  // cartão de aulas: hoje (em Brasília) ou o dia escolhido nas setas (?dia=AAAA-MM-DD)
  const { dia: diaParam } = await searchParams;
  const hojeAulas = agoraBrasilia().data;
  const dia = typeof diaParam === "string" && isoValido(diaParam) ? diaParam : hojeAulas;
  const [resumo, porMes, recibos, agendaDia, chamadasDia, cobranca] = await Promise.all([
    resumoPainel(professor.id, hoje),
    ver.financeiro ? recebidoPorMes(professor.id, hoje) : [],
    ver.recibos ? listarRecibos(professor.id) : [],
    agendaDoPeriodo(professor, dia, dia),
    presencasNaData(professor, dia),
    ver.financeiro
      ? resumoCobranca(professor.id, hoje, professor.diaVencimento)
      : { atrasados: [], vencendo: [], totalAtrasado: 0, totalVencendo: 0 },
  ]);
  // aulas do dia pela agenda (fixas e reposições); desmarcadas pelo professor não entram
  const aulasHoje = agendaDia.filter((o) => o.desmarcada?.por !== "professor");
  const tituloAulas =
    dia === hojeAulas
      ? "Aulas de hoje"
      : dia === somarDiasAgenda(hojeAulas, 1)
        ? "Aulas de amanhã"
        : dia === somarDiasAgenda(hojeAulas, -1)
          ? "Aulas de ontem"
          : `Aulas de ${DIAS_LONGOS[diaDaSemana(dia)].toLowerCase()}, ${dataBR(dia).slice(0, 5)}`;
  const statusHoje = new Map(chamadasDia.map((p) => [`${p.alunoId}-${p.cursoId}`, p.status]));
  const maiorMes = Math.max(...porMes.map((m) => m.total), 1);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-suave">
            {diaSemana}, {dataBR(hoje)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome((membro ?? professor).nome)}!</h1>
        </div>
        <div className="flex gap-2">
          {ver.chamada && (
            <BotaoLink href="/chamada">
              <CircleCheckBig /> Chamada de hoje
            </BotaoLink>
          )}
          {ver.recibos && (
            <BotaoLink href="/recibos/novo" variante="secundario">
              <ReceiptText /> Novo recibo
            </BotaoLink>
          )}
        </div>
      </div>

      {(cobranca.atrasados.length > 0 || cobranca.vencendo.length > 0) && (
        <Link
          href="/financeiro?filtro=aberto"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-borda bg-superficie p-4 shadow-xs transition-colors hover:bg-fundo"
        >
          <span
            className={cn(
              "rounded-xl p-2.5",
              cobranca.atrasados.length ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-marca-suave text-marca-texto",
            )}
          >
            <Wallet className="size-5" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">Cobrança</p>
            <p className="text-suave">
              {[
                cobranca.atrasados.length &&
                  `${cobranca.atrasados.length} ${cobranca.atrasados.length === 1 ? "mensalidade atrasada" : "mensalidades atrasadas"} (${moeda(cobranca.totalAtrasado)})`,
                cobranca.vencendo.length &&
                  `${cobranca.vencendo.length} ${cobranca.vencendo.length === 1 ? "vence" : "vencem"} nos próximos 3 dias (${moeda(cobranca.totalVencendo)})`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-suave" />
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ver.alunos && filtroDeAlunos(acesso) == null && (
          <Indicador titulo="Alunos ativos" valor={resumo.alunosAtivos} icone={<Users />} href="/alunos" />
        )}
        {ver.chamada && filtroDeAlunos(acesso) == null && (
          <Indicador titulo="Chamadas hoje" valor={resumo.chamadasHoje} icone={<CircleCheckBig />} href="/chamada" />
        )}
        {ver.financeiro && <Indicador titulo="Recebido no mês" valor={moeda(resumo.recebidoMes)} icone={<Wallet />} href="/recibos" />}
        {ver.materiais && <Indicador titulo="Materiais" valor={resumo.materiais} icone={<CloudDownload />} href="/materiais" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {ver.financeiro && (
          <Card className="lg:col-span-3">
            <CardTitulo icone={<Wallet />}>Recebido por mês</CardTitulo>
            <div className="flex h-56 items-end gap-3 p-5">
              {porMes.map((m) => {
                const mes = MESES[Number(m.mes.slice(5, 7)) - 1].slice(0, 3);
                return (
                  <div key={m.mes} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-medium text-suave tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                      {moeda(m.total)}
                    </span>
                    <div
                      className="w-full max-w-12 rounded-t-lg bg-marca transition-all group-hover:opacity-80"
                      style={{ height: `${Math.max((m.total / maiorMes) * 100, m.total ? 4 : 1)}%` }}
                    />
                    <span className="text-xs text-suave capitalize">{mes}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className={ver.financeiro ? "lg:col-span-2" : "lg:col-span-5"}>
          <CardTitulo
            icone={<CircleCheckBig />}
            acao={
              <span className="flex items-center gap-0.5">
                <Link
                  href={`/painel?dia=${somarDiasAgenda(dia, -1)}`}
                  className="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-texto"
                  aria-label="Dia anterior"
                >
                  <ChevronLeft className="size-4" />
                </Link>
                {dia !== hojeAulas && (
                  <Link href="/painel" className="rounded-lg px-2 py-1 text-xs text-marca-texto hover:bg-fundo">
                    hoje
                  </Link>
                )}
                <Link
                  href={`/painel?dia=${somarDiasAgenda(dia, 1)}`}
                  className="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-texto"
                  aria-label="Próximo dia"
                >
                  <ChevronRight className="size-4" />
                </Link>
                <Link href={`/agenda?semana=${dia}`} className="ml-1 rounded-lg px-2 py-1 text-xs text-marca-texto hover:bg-fundo">
                  Agenda
                </Link>
              </span>
            }
          >
            {tituloAulas}
          </CardTitulo>
          {aulasHoje.length === 0 ? (
            <p className="p-5 text-sm text-suave">Nenhuma aula neste dia.</p>
          ) : (
            <ul className="divide-y divide-borda">
              {aulasHoje.map((a) => {
                const status = statusHoje.get(`${a.alunoId}-${a.cursoId}`);
                return (
                  <li key={a.chave} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="w-12 font-mono text-xs text-suave">{a.hora ?? "—"}</span>
                    <Link href={`/alunos/${a.alunoId}`} className="min-w-0 flex-1 truncate font-medium hover:text-marca-texto">
                      {a.nome}
                      {a.curso && <span className="font-normal text-suave"> · {rotuloCurso(a.curso, a.professor ?? professor.nome)}</span>}
                    </Link>
                    {status ? (
                      <SeloPresenca status={status} />
                    ) : a.desmarcada ? (
                      <Selo cor="amarelo">avisou que não vem</Selo>
                    ) : a.tipo === "reposicao" ? (
                      <Selo cor="azul">reposição</Selo>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {ver.recibos && (
          <Card className="lg:col-span-5">
            <CardTitulo
              icone={<ReceiptText />}
              acao={
                <Link href="/recibos" className="text-sm text-marca-texto hover:underline">
                  Ver todos
                </Link>
              }
            >
              Últimos recibos
            </CardTitulo>
            {recibos.length === 0 ? (
              <p className="p-5 text-sm text-suave">Nenhum recibo ainda.</p>
            ) : (
              <ul className="divide-y divide-borda">
                {recibos.slice(0, 5).map(({ recibo, aluno, instituicao }) => (
                  <li key={recibo.id}>
                    <Link href={`/recibos/${recibo.id}`} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-fundo/60">
                      <span className="font-mono text-xs text-suave">#{numeroRecibo(recibo.numero)}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{instituicao?.nome ?? aluno?.nome}</span>
                      <span className="hidden text-suave sm:inline">{dataBR(recibo.dataPagamento)}</span>
                      <span className="font-semibold tabular-nums">{moeda(recibo.valorCentavos)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

function Indicador({ titulo, valor, icone, href }: { titulo: string; valor: ReactNode; icone: ReactNode; href: string }) {
  return (
    <Link href={href} className="min-w-0">
      <Card className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between text-suave">
          <span className="text-sm">{titulo}</span>
          <span className="rounded-lg bg-marca-suave p-2 text-marca-texto [&_svg]:size-4">{icone}</span>
        </div>
        <p className="mt-3 truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{valor}</p>
      </Card>
    </Link>
  );
}

function EsqueletoPainel() {
  return (
    <div className="space-y-6">
      <Esqueleto className="h-14 w-72" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Esqueleto className="h-72 rounded-2xl" />
    </div>
  );
}
