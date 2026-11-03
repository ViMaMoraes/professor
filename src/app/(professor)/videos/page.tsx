import { ArrowDown, ArrowUp, FolderPlus, Pencil, Plus, Trash2, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { excluirModulo, moverModulo, moverVideo, salvarModulo } from "@/app/acoes/videos";
import { BotaoAcao } from "@/components/botao-acao";
import { CapaVideo } from "@/components/capa-video";
import { JanelaFormulario } from "@/components/janela-formulario";
import { BotaoLink, Cabecalho, Campo, Card, Input, Selo, Textarea, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarModulos, listarVideos } from "@/lib/consultas";
import type { Modulo } from "@/lib/db/schema";
import { agruparPorModulo, urlCapa } from "@/lib/video";

export const metadata: Metadata = { title: "Vídeos" };

export default async function PaginaVideos() {
  const professor = await exigirProfessor();
  const [lista, modulos] = await Promise.all([listarVideos(professor.id), listarModulos(professor.id)]);
  const grupos = agruparPorModulo(
    lista.map((l) => ({ ...l.video, publico: l.publico, vistos: l.vistos })),
    modulos,
    { incluirVazios: true },
  );

  return (
    <>
      <Cabecalho
        titulo="Vídeos"
        descricao="Vídeos do YouTube ou do Google Drive, assistidos dentro do site. Organize em módulos, na ordem que quiser."
      >
        <JanelaModulo />
        <BotaoLink href="/videos/novo">
          <Plus /> Adicionar vídeo
        </BotaoLink>
      </Cabecalho>

      {grupos.length === 0 ? (
        <Card>
          <Vazio icone={<Video />} titulo="Nenhum vídeo ainda">
            Cole o link de um vídeo do YouTube (pode ser “não listado”) ou de um vídeo no seu Google Drive.
          </Vazio>
        </Card>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ modulo, videos }, i) => (
            <Card key={modulo?.id ?? "outros"}>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-borda px-5 py-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">{modulo?.nome ?? "Outros vídeos"}</h2>
                  {modulo?.descricao && <p className="text-sm text-suave">{modulo.descricao}</p>}
                </div>
                {modulo && (
                  <div className="flex items-center gap-1">
                    <BotaoAcao
                      acao={moverModulo.bind(null, modulo.id, -1)}
                      variante="fantasma"
                      tamanho="icone"
                      className="size-8"
                      disabled={i === 0}
                      aria-label="Subir módulo"
                    >
                      <ArrowUp />
                    </BotaoAcao>
                    <BotaoAcao
                      acao={moverModulo.bind(null, modulo.id, 1)}
                      variante="fantasma"
                      tamanho="icone"
                      className="size-8"
                      disabled={i === modulos.length - 1}
                      aria-label="Descer módulo"
                    >
                      <ArrowDown />
                    </BotaoAcao>
                    <JanelaModulo modulo={modulo} />
                    <BotaoAcao
                      acao={excluirModulo.bind(null, modulo.id)}
                      confirmar={`Excluir o módulo “${modulo.nome}”?`}
                      detalhe="Os vídeos dele não são apagados: vão para “Outros vídeos”."
                      sucesso="Módulo excluído."
                      variante="fantasma"
                      tamanho="icone"
                      className="size-8 hover:text-red-600"
                      aria-label="Excluir módulo"
                    >
                      <Trash2 />
                    </BotaoAcao>
                  </div>
                )}
              </div>
              {videos.length === 0 ? (
                <p className="px-5 py-4 text-sm text-suave">Nenhum vídeo neste módulo. Escolha o módulo ao adicionar ou editar um vídeo.</p>
              ) : (
                <ul className="divide-y divide-borda">
                  {videos.map((v, j) => (
                    <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                      <Link href={`/videos/${v.id}`} className="w-28 shrink-0 sm:w-36">
                        <CapaVideo src={urlCapa(v)} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/videos/${v.id}`} className="line-clamp-2 font-medium hover:text-marca-texto">
                          {v.titulo}
                        </Link>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-suave">
                          <Selo>{v.origem === "youtube" ? "YouTube" : "Drive"}</Selo>
                          {!v.paraTodos && (
                            <Selo>
                              {v.publico} {v.publico === 1 ? "aluno" : "alunos"}
                            </Selo>
                          )}
                          <span>
                            visto por {v.vistos} de {v.publico}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col">
                        <BotaoAcao
                          acao={moverVideo.bind(null, v.id, -1)}
                          variante="fantasma"
                          tamanho="icone"
                          className="size-8"
                          disabled={j === 0}
                          aria-label="Subir vídeo"
                        >
                          <ArrowUp />
                        </BotaoAcao>
                        <BotaoAcao
                          acao={moverVideo.bind(null, v.id, 1)}
                          variante="fantasma"
                          tamanho="icone"
                          className="size-8"
                          disabled={j === videos.length - 1}
                          aria-label="Descer vídeo"
                        >
                          <ArrowDown />
                        </BotaoAcao>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/** Criar (sem `modulo`) ou renomear um módulo. */
function JanelaModulo({ modulo }: { modulo?: Modulo }) {
  return (
    <JanelaFormulario
      rotulo={
        modulo ? (
          <Pencil />
        ) : (
          <>
            <FolderPlus /> Novo módulo
          </>
        )
      }
      variante={modulo ? "fantasma" : "secundario"}
      tamanho={modulo ? "icone" : "md"}
      className={modulo ? "size-8" : undefined}
      aria-label={modulo ? "Editar módulo" : undefined}
      titulo={modulo ? "Editar módulo" : "Novo módulo"}
      subtitulo="Os alunos veem os módulos nesta ordem, com os vídeos dentro."
      acao={salvarModulo.bind(null, modulo?.id ?? null)}
      enviar={modulo ? "Salvar" : "Criar módulo"}
    >
      <Campo rotulo="Nome *">
        <Input name="nome" required defaultValue={modulo?.nome} placeholder="Ex.: Módulo 1 – Iniciante" autoFocus />
      </Campo>
      <Campo rotulo="Descrição">
        <Textarea name="descricao" rows={2} defaultValue={modulo?.descricao ?? ""} placeholder="Opcional" />
      </Campo>
    </JanelaFormulario>
  );
}
