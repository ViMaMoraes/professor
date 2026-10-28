import { CircleCheckBig, CloudDownload, ReceiptText, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { SeloPresenca } from "@/components/selos";
import { BotaoLink, Card, CardTitulo, Esqueleto } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { DIAS_SEMANA } from "@/lib/constantes";
import { listarAlunos, listarRecibos, presencasNaData, recebidoPorMes, resumoPainel } from "@/lib/consultas";
import { dataBR, hojeISO, MESES, moeda, numeroRecibo, primeiroNome } from "@/lib/formato";

export const metadata: Metadata = { title: "Painel" };

export default function PaginaPainel() {
  return (
    <Suspense fallback={<EsqueletoPainel />}>
      <Painel />
    </Suspense>
  );
}

async function Painel() {
  const professor = await exigirProfessor();
  const hoje = hojeISO();
  const diaSemana = DIAS_SEMANA[new Date(`${hoje}T12:00:00Z`).getUTCDay()];
  const [resumo, porMes, recibos, alunos, chamadasHoje] = await Promise.all([
    resumoPainel(professor.id, hoje),
    recebidoPorMes(professor.id, hoje),
    listarRecibos(professor.id),
    listarAlunos(professor.id),
    presencasNaData(professor.id, hoje),
  ]);
  const aulasHoje = alunos
    .filter((a) => a.diaAula === diaSemana)
    .sort((a, b) => (a.horario ?? "").localeCompare(b.horario ?? ""));
  const statusHoje = new Map(chamadasHoje.map((p) => [p.alunoId, p.status]));
  const maiorMes = Math.max(...porMes.map((m) => m.total), 1);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-suave">
            {diaSemana}, {dataBR(hoje)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome(professor.nome)}!</h1>
        </div>
        <div className="flex gap-2">
          <BotaoLink href="/chamada">
            <CircleCheckBig /> Chamada de hoje
          </BotaoLink>
          <BotaoLink href="/recibos/novo" variante="secundario">
            <ReceiptText /> Novo recibo
          </BotaoLink>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador titulo="Alunos ativos" valor={resumo.alunosAtivos} icone={<Users />} href="/alunos" />
        <Indicador titulo="Chamadas hoje" valor={resumo.chamadasHoje} icone={<CircleCheckBig />} href="/chamada" />
        <Indicador titulo="Recebido no mês" valor={moeda(resumo.recebidoMes)} icone={<Wallet />} href="/recibos" />
        <Indicador titulo="Materiais" valor={resumo.materiais} icone={<CloudDownload />} href="/materiais" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
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

        <Card className="lg:col-span-2">
          <CardTitulo icone={<CircleCheckBig />}>Aulas de hoje</CardTitulo>
          {aulasHoje.length === 0 ? (
            <p className="p-5 text-sm text-suave">Nenhum aluno com aula marcada para {diaSemana.toLowerCase()}.</p>
          ) : (
            <ul className="divide-y divide-borda">
              {aulasHoje.map((a) => {
                const status = statusHoje.get(a.id);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="w-12 font-mono text-xs text-suave">{a.horario ?? "—"}</span>
                    <Link href={`/alunos/${a.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-marca-texto">
                      {a.nome}
                    </Link>
                    {status ? <SeloPresenca status={status} /> : <span className="text-xs text-suave">{a.instrumento}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

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
