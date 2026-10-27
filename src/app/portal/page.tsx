import { CalendarCheck, CloudDownload, Download, ExternalLink, FileDown, QrCode, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { IconeMaterial } from "@/components/icone-material";
import { BotaoVer, CaixaSelecao, ProvedorSelecao } from "@/components/materiais-selecao";
import { SeloPresenca } from "@/components/selos";
import { Card, CardTitulo, EsqueletoPagina, Selo, Vazio } from "@/components/ui";
import { exigirAlunoComProfessor } from "@/lib/auth";
import { frequenciaDoAluno, materiaisDoAluno, presencasDoAluno, recibosDoAluno } from "@/lib/consultas";
import { NOME_TIPO_DRIVE, podeBaixarEmLote, urlBaixar } from "@/lib/drive";
import { dataBR, moeda, numeroRecibo, primeiroNome } from "@/lib/formato";

import { CopiarPix } from "./copiar-pix";

export const metadata: Metadata = { title: "Minha área" };

export default function PaginaPortal() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const { aluno, professor } = await exigirAlunoComProfessor();
  const [materiais, recibos, presencas, frequencia] = await Promise.all([
    materiaisDoAluno(aluno),
    recibosDoAluno(aluno.id),
    presencasDoAluno(aluno.id, 12),
    frequenciaDoAluno(aluno.id),
  ]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome(aluno.nome)}! 🎶</h1>
        <p className="mt-1 text-sm text-suave">
          {[aluno.instrumento, aluno.diaAula && `Aula ${aluno.diaAula.toLowerCase()} ${aluno.horario ?? ""}`].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitulo icone={<CloudDownload />}>Meus materiais</CardTitulo>
          {materiais.length === 0 ? (
            <Vazio icone={<CloudDownload />} titulo="Nenhum material ainda">
              Quando o professor liberar partituras, áudios ou vídeos, eles aparecem aqui.
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
                      <BotaoVer id={m.id} titulo={m.titulo} className="text-suave hover:text-marca-texto [&>span]:hidden sm:[&>span]:inline" />
                      {urlBaixar(m) && (
                        <a href={`/api/materiais/${m.id}?baixar=1`} className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-marca-texto" title="Baixar">
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

        <div className="space-y-6 lg:col-span-2">
          {professor?.chavePix && (
            <Card>
              <CardTitulo icone={<QrCode />}>Pagamento via Pix</CardTitulo>
              <div className="p-5">
                <CopiarPix chave={professor.chavePix} />
                {aluno.mensalidadeCentavos != null && (
                  <p className="mt-2 text-sm text-suave">Mensalidade: {moeda(aluno.mensalidadeCentavos)}</p>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardTitulo icone={<ReceiptText />}>Meus recibos</CardTitulo>
            {recibos.length === 0 ? (
              <p className="p-5 text-sm text-suave">Nenhum recibo.</p>
            ) : (
              <ul className="divide-y divide-borda">
                {recibos.map((r) => (
                  <li key={r.id}>
                    <a href={`/api/recibos/${r.id}?baixar=1`} className="flex items-center gap-3 px-5 py-3 hover:bg-fundo/60">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.referente}</p>
                        <p className="text-xs text-suave">
                          #{numeroRecibo(r.numero)} · {dataBR(r.dataPagamento)} · {moeda(r.valorCentavos)}
                        </p>
                      </div>
                      <FileDown className="size-4 text-suave" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitulo icone={<CalendarCheck />} acao={frequencia != null && <Selo cor="marca">{frequencia}% de presença</Selo>}>
              Frequência
            </CardTitulo>
            {presencas.length === 0 ? (
              <p className="p-5 text-sm text-suave">Nenhuma aula registrada.</p>
            ) : (
              <ul className="divide-y divide-borda">
                {presencas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="tabular-nums">{dataBR(p.data)}</span>
                    <SeloPresenca status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
