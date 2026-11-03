import { Bell, BookOpenText, CloudDownload, Download, ExternalLink, House, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { IconeMaterial } from "@/components/icone-material";
import { BotaoVer, CaixaSelecao, ProvedorSelecao } from "@/components/materiais-selecao";
import { Card, CardTitulo, cn, EsqueletoPagina, Vazio } from "@/components/ui";
import { agoraBrasilia, DIAS_LONGOS, diaDaSemana, minutosDe, somarDiasAgenda } from "@/lib/agenda";
import { exigirAlunoComProfessor } from "@/lib/auth";
import { agendaDoPeriodo, avisosDoAluno, diarioDoAluno, materiaisDoAluno, reposicoesPendentes } from "@/lib/consultas";
import { NOME_TIPO_DRIVE, podeBaixarEmLote, urlBaixar } from "@/lib/drive";
import { dataBR, primeiroNome } from "@/lib/formato";
import { chavePublicaVapid } from "@/lib/push";

import { ProximasAulas, type AulaDoAluno } from "./proximas-aulas";

export const metadata: Metadata = { title: "Downloads" };

export default function PaginaPortal() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const { aluno, professor } = await exigirAlunoComProfessor();
  const agora = agoraBrasilia();
  const [materiais, avisos, diario, agenda, pendentes] = await Promise.all([
    materiaisDoAluno(aluno),
    avisosDoAluno(aluno, 5),
    diarioDoAluno(aluno.id, { soVisiveis: true, limite: 30 }),
    agendaDoPeriodo(professor, agora.data, somarDiasAgenda(agora.data, 13), { alunoId: aluno.id }),
    reposicoesPendentes(professor.id, aluno.id),
  ]);
  // próximas aulas (as de hoje que já começaram ficam de fora); avisar falta só com 2 horas ou mais de antecedência
  const minutosAte = (data: string, hora: string | null) =>
    (Date.parse(`${data}T00:00:00Z`) - Date.parse(`${agora.data}T00:00:00Z`)) / 60000 + (hora ? minutosDe(hora) : 24 * 60) - agora.minutos;
  const proximas: AulaDoAluno[] = agenda
    .filter((o) => minutosAte(o.data, o.hora) > 0)
    .slice(0, 4)
    .map((o) => ({
      chave: o.chave,
      data: o.data,
      hora: o.hora,
      quando: `${DIAS_LONGOS[diaDaSemana(o.data)].toLowerCase()}, ${dataBR(o.data).slice(0, 5)}`,
      reposicao: o.tipo === "reposicao",
      desmarcadaPor: o.desmarcada?.por ?? null,
      motivo: o.desmarcada?.motivo ?? null,
      podeAvisar: minutosAte(o.data, o.hora) >= 120,
    }));
  const chavePublica = chavePublicaVapid();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome(aluno.nome)}!</h1>
        <p className="mt-1 text-sm text-suave">Aqui ficam os materiais liberados para você.</p>
      </div>

      {aluno.mensagem && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-marca p-5 text-marca-contraste shadow-sm">
          <MessageSquareText className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide uppercase opacity-70">Mensagem de {primeiroNome(professor.nome)}</p>
            <p className="mt-1 whitespace-pre-line">{aluno.mensagem}</p>
          </div>
        </div>
      )}

      {chavePublica && (
        <div id="notificacoes" className="mb-6 scroll-mt-20">
          <AtivarNotificacoes
            chavePublica={chavePublica}
            titulo="Receba no celular o lembrete das aulas e os avisos"
            motivo="antes das suas aulas e quando o professor mandar um aviso ou liberar material"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={cn("min-w-0 space-y-6", avisos.length ? "lg:col-span-2" : "lg:col-span-3")}>
          {(proximas.length > 0 || pendentes.length > 0) && <ProximasAulas aulas={proximas} reposicoesAMarcar={pendentes.length} />}
          <Card>
            <CardTitulo icone={<CloudDownload />}>Downloads</CardTitulo>
            {materiais.length === 0 ? (
              <Vazio icone={<CloudDownload />} titulo="Nenhum material ainda">
                Quando o professor liberar arquivos, eles aparecem aqui.
              </Vazio>
            ) : (
              <ProvedorSelecao itens={materiais.filter(podeBaixarEmLote).map(({ id, titulo }) => ({ id, titulo }))}>
                <ul className="divide-y divide-borda">
                  {materiais.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                      {podeBaixarEmLote(m) ? <CaixaSelecao id={m.id} titulo={m.titulo} /> : <span className="w-6 shrink-0" />}
                      <div className="hidden rounded-xl bg-marca-suave p-2.5 text-marca-texto sm:block">
                        <IconeMaterial tipo={m.tipoDrive} categoria={m.categoria} className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{m.titulo}</p>
                        {m.descricao && <p className="text-sm text-suave">{m.descricao}</p>}
                        <p className="mt-0.5 text-xs text-suave">
                          {[m.categoria, NOME_TIPO_DRIVE[m.tipoDrive], dataBR(m.criadoEm)].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <BotaoVer
                          id={m.id}
                          titulo={m.titulo}
                          className="text-suave hover:text-marca-texto [&>span]:hidden sm:[&>span]:inline"
                        />
                        {urlBaixar(m) && (
                          <a
                            href={`/api/materiais/${m.id}?baixar=1`}
                            className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-marca-texto"
                            title="Baixar"
                          >
                            <Download className="size-5" />
                          </a>
                        )}
                        <a
                          href={`/api/materiais/${m.id}`}
                          target="_blank"
                          rel="noopener"
                          className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-marca-texto"
                          title="Abrir no Drive"
                        >
                          <ExternalLink className="size-5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </ProvedorSelecao>
            )}
          </Card>

          {diario.length > 0 && (
            <Card>
              <CardTitulo icone={<BookOpenText />}>Minhas aulas</CardTitulo>
              <ul className="divide-y divide-borda">
                {diario.map((r) => (
                  <li key={r.id} className="flex gap-4 px-5 py-3.5 text-sm">
                    <span className="w-20 shrink-0 tabular-nums text-suave">{dataBR(r.data)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-line">{r.conteudo}</p>
                      {r.paraCasa && (
                        <p className="mt-1.5 rounded-lg bg-fundo px-3 py-2 whitespace-pre-line">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-suave">
                            <House className="size-3.5" /> Para estudar em casa
                          </span>
                          {r.paraCasa}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {avisos.length > 0 && (
          <Card className="self-start">
            <CardTitulo icone={<Bell />}>Avisos</CardTitulo>
            <ul className="divide-y divide-borda">
              {avisos.map((a) => (
                <li key={a.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium">{a.titulo}</p>
                  {a.mensagem && <p className="mt-0.5 text-sm whitespace-pre-line text-suave">{a.mensagem}</p>}
                  <p className="mt-1 text-xs text-suave">{dataBR(a.criadoEm)}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
