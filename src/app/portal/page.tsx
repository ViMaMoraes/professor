import { Bell, CloudDownload, Download, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { IconeMaterial } from "@/components/icone-material";
import { BotaoVer, CaixaSelecao, ProvedorSelecao } from "@/components/materiais-selecao";
import { Card, CardTitulo, EsqueletoPagina, Vazio } from "@/components/ui";
import { exigirAlunoComProfessor } from "@/lib/auth";
import { avisosDoAluno, materiaisDoAluno } from "@/lib/consultas";
import { NOME_TIPO_DRIVE, podeBaixarEmLote, urlBaixar } from "@/lib/drive";
import { dataBR, primeiroNome } from "@/lib/formato";
import { chavePublicaVapid } from "@/lib/push";

import { AtivarNotificacoes } from "@/components/ativar-notificacoes";

export const metadata: Metadata = { title: "Downloads" };

export default function PaginaPortal() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const { aluno } = await exigirAlunoComProfessor();
  const [materiais, avisos] = await Promise.all([materiaisDoAluno(aluno), avisosDoAluno(aluno, 5)]);
  const chavePublica = chavePublicaVapid();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome(aluno.nome)}!</h1>
        <p className="mt-1 text-sm text-suave">Aqui ficam os materiais liberados para você.</p>
      </div>

      {chavePublica && (
        <div className="mb-6">
          <AtivarNotificacoes chavePublica={chavePublica} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={avisos.length ? "lg:col-span-2" : "lg:col-span-3"}>
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
