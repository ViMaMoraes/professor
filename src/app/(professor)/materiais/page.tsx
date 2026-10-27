import { CloudDownload, Download, ExternalLink, Link2, Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { excluirMaterial } from "@/app/acoes/materiais";
import { BotaoAcao } from "@/components/botao-acao";
import { IconeMaterial } from "@/components/icone-material";
import { BotaoVer, CaixaSelecao, ProvedorSelecao } from "@/components/materiais-selecao";
import { BotaoLink, Cabecalho, Card, EsqueletoPagina, Selo, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarMateriais } from "@/lib/consultas";
import { NOME_TIPO_DRIVE, podeBaixarEmLote, urlBaixar } from "@/lib/drive";
import { dataBR } from "@/lib/formato";

export const metadata: Metadata = { title: "Central de downloads" };

export default function PaginaMateriais() {
  return (
    <>
      <Cabecalho
        titulo="Central de downloads"
        descricao="Materiais guardados no seu Google Drive. Escolha quem pode acessar cada um."
      >
        <BotaoLink href="/materiais/novo">
          <Link2 /> Adicionar material
        </BotaoLink>
      </Cabecalho>
      <Suspense fallback={<EsqueletoPagina />}>
        <Lista />
      </Suspense>
    </>
  );
}

async function Lista() {
  const professor = await exigirProfessor();
  const materiais = await listarMateriais(professor.id);

  if (materiais.length === 0) {
    return (
      <Card>
        <Vazio icone={<CloudDownload />} titulo="Nenhum material ainda">
          Cole o link de um arquivo ou pasta do seu Google Drive e libere para seus alunos.
        </Vazio>
      </Card>
    );
  }

  const selecionaveis = materiais.filter(podeBaixarEmLote).map(({ id, titulo }) => ({ id, titulo }));

  return (
    <ProvedorSelecao itens={selecionaveis} comMenuLateral>
      <p className="mb-3 text-sm text-suave">Marque vários para baixar tudo junto em ZIP ou num PDF único.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {materiais.map((m) => (
          <Card key={m.id} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              {podeBaixarEmLote(m) ? <CaixaSelecao id={m.id} titulo={m.titulo} /> : <span className="w-6 shrink-0" />}
              <div className="rounded-xl bg-marca-suave p-2.5 text-marca-texto">
                <IconeMaterial tipo={m.tipoDrive} categoria={m.categoria} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{m.titulo}</p>
                <p className="truncate text-xs text-suave">
                  {NOME_TIPO_DRIVE[m.tipoDrive]} · {dataBR(m.criadoEm)}
                </p>
              </div>
              {m.categoria && <Selo cor="marca">{m.categoria}</Selo>}
            </div>
            {m.descricao && <p className="mt-3 text-sm text-suave">{m.descricao}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.paraTodos ? (
                <Selo cor="azul">Todos os alunos</Selo>
              ) : (
                m.alunos.map((a) => (
                  <Link key={a.alunoId} href={`/alunos/${a.alunoId}`}>
                    <Selo>{a.nome}</Selo>
                  </Link>
                ))
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-1 border-t border-borda pt-4">
              <BotaoVer id={m.id} titulo={m.titulo} />
              {urlBaixar(m) && (
                <a href={`/api/materiais/${m.id}?baixar=1`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-fundo">
                  <Download className="size-4" /> Baixar
                </a>
              )}
              <Link href={`/materiais/${m.id}/editar`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-fundo">
                <Pencil className="size-4" /> Editar
              </Link>
              <a
                href={`/api/materiais/${m.id}`}
                target="_blank"
                rel="noopener"
                title="Abrir no Drive"
                aria-label="Abrir no Drive"
                className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm hover:bg-fundo"
              >
                <ExternalLink className="size-4" />
              </a>
              <BotaoAcao
                acao={excluirMaterial.bind(null, m.id)}
                confirmar={`Excluir “${m.titulo}”?`}
                variante="fantasma"
                tamanho="sm"
                className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash2 /> Excluir
              </BotaoAcao>
            </div>
          </Card>
        ))}
      </div>
    </ProvedorSelecao>
  );
}
