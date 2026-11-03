import { ChevronLeft, ChevronRight, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { registrarVisualizacao } from "@/app/acoes/videos";
import { CapaVideo } from "@/components/capa-video";
import { PlayerVideo } from "@/components/player-video";
import { BotaoLink, Card, cn, Voltar } from "@/components/ui";
import { exigirAlunoComProfessor } from "@/lib/auth";
import { videosDoAluno } from "@/lib/consultas";
import { agruparPorModulo, urlCapa, urlPlayer } from "@/lib/video";

export const metadata: Metadata = { title: "Vídeo" };

export default async function PaginaVideoAluno(props: PageProps<"/portal/videos/[id]">) {
  const { aluno } = await exigirAlunoComProfessor();
  const id = Number((await props.params).id);
  const { videos, modulos } = await videosDoAluno(aluno);
  // vídeo que o aluno não pode ver (ou não existe): como se não existisse
  const video = videos.find((v) => v.id === id);
  if (!video) notFound();

  // sequência: todos os vídeos na ordem dos módulos, para "anterior" e "próximo"
  const grupos = agruparPorModulo(videos, modulos);
  const sequencia = grupos.flatMap((g) => g.videos);
  const i = sequencia.findIndex((v) => v.id === id);
  const anterior = sequencia[i - 1];
  const proximo = sequencia[i + 1];
  const grupo = grupos.find((g) => g.videos.some((v) => v.id === id))!;

  return (
    <>
      <Voltar href="/portal/videos">Voltar para vídeos</Voltar>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <PlayerVideo
            origem={video.origem}
            url={urlPlayer(video)}
            titulo={video.titulo}
            proximo={proximo ? { href: `/portal/videos/${proximo.id}`, titulo: `Próximo: ${proximo.titulo}` } : null}
            aoAbrir={registrarVisualizacao.bind(null, video.id)}
          />
          <div>
            <p className="text-xs text-suave">{grupo.modulo?.nome ?? "Outros vídeos"}</p>
            <h1 className="text-xl font-semibold tracking-tight">{video.titulo}</h1>
            {video.descricao && <p className="mt-2 text-sm whitespace-pre-line text-suave">{video.descricao}</p>}
          </div>
          <div className="flex justify-between gap-2">
            {anterior ? (
              <BotaoLink href={`/portal/videos/${anterior.id}`} variante="secundario" tamanho="sm">
                <ChevronLeft /> Anterior
              </BotaoLink>
            ) : (
              <span />
            )}
            {proximo && (
              <BotaoLink href={`/portal/videos/${proximo.id}`} tamanho="sm">
                Próximo <ChevronRight />
              </BotaoLink>
            )}
          </div>
        </div>

        <Card className="self-start">
          <p className="border-b border-borda px-4 py-3 text-sm font-semibold">{grupo.modulo?.nome ?? "Outros vídeos"}</p>
          <ul className="divide-y divide-borda">
            {grupo.videos.map((v, n) => (
              <li key={v.id}>
                <Link
                  href={`/portal/videos/${v.id}`}
                  aria-current={v.id === id ? "page" : undefined}
                  className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-fundo", v.id === id && "bg-marca-suave/60")}
                >
                  <span className="w-4 shrink-0 text-xs text-suave">{n + 1}</span>
                  <CapaVideo src={urlCapa(v)} className="w-20 shrink-0 rounded-lg [&>span]:hidden" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="line-clamp-2">{v.titulo}</span>
                    {v.visto && (
                      <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                        <CircleCheck className="size-3" /> visto
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
