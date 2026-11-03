import { Building2, ChevronLeft, ChevronRight, FileText, ReceiptText, Undo2, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { excluirPagamento } from "@/app/acoes/financeiro";
import { BotaoAcao } from "@/components/botao-acao";
import { BotaoLink, Cabecalho, Card, cn, EsqueletoPagina, Selo, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { financeiroDoMes } from "@/lib/consultas";
import { mesValido, nomeMes, resumoFinanceiro, somarMeses, type LinhaFinanceiro } from "@/lib/financeiro";
import { dataBR, hojeISO, moeda, numeroRecibo } from "@/lib/formato";

import { MarcarPagamento } from "./marcar-pagamento";

export const metadata: Metadata = { title: "Financeiro" };

const FILTROS = [
  { valor: "todos", nome: "Todos" },
  { valor: "aberto", nome: "Em aberto" },
  { valor: "pago", nome: "Pagos" },
] as const;

export default function PaginaFinanceiro(props: PageProps<"/financeiro">) {
  return (
    <>
      <Cabecalho titulo="Financeiro" descricao="Mensalidades do mês: quem já pagou (recibo ou pagamento marcado) e quem está em aberto." />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/financeiro">["searchParams"] }) {
  const professor = await exigirProfessor();
  const params = await searchParams;
  const hoje = hojeISO();
  const mes = mesValido(params.mes) ? params.mes : hoje.slice(0, 7);
  const filtro = FILTROS.some((f) => f.valor === params.filtro) ? (params.filtro as (typeof FILTROS)[number]["valor"]) : "todos";
  const linhas = await financeiroDoMes(professor.id, mes, hoje, professor.diaVencimento);
  const resumo = resumoFinanceiro(linhas);
  const contagem = { todos: linhas.length, aberto: linhas.filter((l) => l.situacao !== "pago").length, pago: linhas.filter((l) => l.situacao === "pago").length };
  const visiveis = linhas.filter((l) => filtro === "todos" || (filtro === "pago" ? l.situacao === "pago" : l.situacao !== "pago"));
  const link = (m: string, f = filtro) => `/financeiro?mes=${m}${f !== "todos" ? `&filtro=${f}` : ""}`;

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-2">
        <BotaoLink href={link(somarMeses(mes, -1))} variante="secundario" tamanho="icone" aria-label="Mês anterior">
          <ChevronLeft />
        </BotaoLink>
        <div className="text-center">
          <p className="text-lg font-semibold">{nomeMes(mes)}</p>
          {mes !== hoje.slice(0, 7) && (
            <Link href={link(hoje.slice(0, 7))} className="text-xs text-marca-texto hover:underline">
              Voltar para o mês atual
            </Link>
          )}
        </div>
        <BotaoLink href={link(somarMeses(mes, 1))} variante="secundario" tamanho="icone" aria-label="Próximo mês">
          <ChevronRight />
        </BotaoLink>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Total titulo="Previsto" valor={resumo.previsto} />
        <Total titulo="Recebido" valor={resumo.recebido} cor="text-emerald-600 dark:text-emerald-400" />
        <Total titulo="A vencer" valor={resumo.aVencer} />
        <Total titulo="Atrasado" valor={resumo.atrasado} cor={resumo.atrasado ? "text-red-600 dark:text-red-400" : undefined} />
      </div>

      <div className="mb-3 flex gap-1 rounded-xl bg-fundo p-1 sm:w-fit" role="tablist">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={link(mes, f.valor)}
            role="tab"
            aria-selected={filtro === f.valor}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap sm:flex-none",
              filtro === f.valor ? "bg-superficie shadow-sm" : "text-suave hover:text-texto",
            )}
          >
            {f.nome} <span className="text-xs text-suave">{contagem[f.valor]}</span>
          </Link>
        ))}
      </div>

      <Card>
        {linhas.length === 0 ? (
          <Vazio icone={<Wallet />} titulo="Nenhuma mensalidade neste mês">
            Cadastre a mensalidade dos alunos particulares e o valor mensal das instituições para acompanhar aqui.
          </Vazio>
        ) : visiveis.length === 0 ? (
          <p className="p-5 text-sm text-suave">{filtro === "pago" ? "Ninguém pagou ainda neste mês." : "Tudo pago neste mês. 🎉"}</p>
        ) : (
          <ul className="divide-y divide-borda">
            {visiveis.map((l) => (
              <Linha key={`${l.pagador.tipo}-${l.pagador.id}`} linha={l} mes={mes} hoje={hoje} />
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-xs text-suave">
        Entram os alunos particulares com mensalidade e as instituições com valor mensal (alunos de instituição são cobrados pela instituição).
        O vencimento padrão é dia {professor.diaVencimento}; mude em Configurações ou no cadastro de cada um.
      </p>
    </>
  );
}

function Total({ titulo, valor, cor }: { titulo: string; valor: number; cor?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-suave">{titulo}</p>
      <p className={cn("mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl", cor)}>{moeda(valor)}</p>
    </Card>
  );
}

function SeloSituacao({ linha: l }: { linha: LinhaFinanceiro }) {
  if (l.situacao === "pago") return <Selo cor="verde">Pago</Selo>;
  if (l.situacao === "atrasado")
    return (
      <Selo cor="vermelho">
        {l.pagoCentavos ? `Parcial · falta ${moeda(l.faltaCentavos)}` : "Atrasado"} · {l.diasAtraso} {l.diasAtraso === 1 ? "dia" : "dias"}
      </Selo>
    );
  if (l.situacao === "parcial") return <Selo cor="amarelo">Parcial · falta {moeda(l.faltaCentavos)}</Selo>;
  return <Selo>A vencer</Selo>;
}

function Linha({ linha: l, mes, hoje }: { linha: LinhaFinanceiro; mes: string; hoje: string }) {
  const { pagador: p } = l;
  const href = p.tipo === "aluno" ? `/alunos/${p.id}` : `/instituicoes/${p.id}`;
  const novoRecibo = `/recibos/novo?${p.tipo}=${p.id}&referencia=${mes}&valor=${l.faltaCentavos}`;
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className="truncate font-medium hover:text-marca-texto">
            {p.nome}
          </Link>
          {p.tipo === "instituicao" && <Building2 className="size-3.5 shrink-0 text-suave" aria-label="Instituição" />}
          <SeloSituacao linha={l} />
        </div>
        <p className="mt-0.5 text-sm text-suave">
          {moeda(l.esperadoCentavos)} · vence {dataBR(l.vencimento)}
        </p>
        {l.lancamentos.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {l.lancamentos.map((x) => (
              <Lancamento key={`${x.origem}-${x.id}`} icone={x.origem === "recibo" ? <ReceiptText /> : <FileText />}>
                <span>
                  {moeda(x.valorCentavos)} em {dataBR(x.dataPagamento)}
                  {x.formaPagamento && ` · ${x.formaPagamento}`} ·{" "}
                  {x.origem === "recibo" ? (
                    <Link href={`/recibos/${x.id}`} className="text-marca-texto hover:underline">
                      recibo nº {numeroRecibo(x.numero!)}
                    </Link>
                  ) : (
                    "sem recibo"
                  )}
                </span>
                {x.origem === "manual" && (
                  <span className="flex gap-1">
                    <BotaoLink href={`/recibos/novo?pagamento=${x.id}`} variante="secundario" tamanho="sm" className="h-7 px-2 text-xs">
                      Gerar recibo
                    </BotaoLink>
                    <BotaoAcao
                      acao={excluirPagamento.bind(null, x.id)}
                      confirmar="Desfazer este pagamento?"
                      detalhe="Ele deixa de contar no mês. Use se marcou errado."
                      sucesso="Pagamento desfeito."
                      variante="fantasma"
                      tamanho="sm"
                      className="h-7 px-2 text-xs"
                      title="Desfazer"
                    >
                      <Undo2 /> Desfazer
                    </BotaoAcao>
                  </span>
                )}
              </Lancamento>
            ))}
          </ul>
        )}
      </div>
      {l.faltaCentavos > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2">
          <MarcarPagamento
            tipo={p.tipo}
            pagadorId={p.id}
            nome={p.nome}
            referencia={mes}
            nomeMes={nomeMes(mes)}
            faltaCentavos={l.faltaCentavos}
            hoje={hoje}
          />
          <BotaoLink href={novoRecibo} variante="secundario" tamanho="sm">
            <ReceiptText /> Gerar recibo
          </BotaoLink>
        </div>
      )}
    </li>
  );
}

function Lancamento({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-suave">
      <span className="mt-0.5 shrink-0 [&>svg]:size-3.5">{icone}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">{children}</div>
    </li>
  );
}
