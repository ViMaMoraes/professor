import { CircleCheck, CircleDashed, Eye, Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { excluirVideo } from "@/app/acoes/videos";
import { BotaoAcao } from "@/components/botao-acao";
import { PlayerVideo } from "@/components/player-video";
import { BotaoLink, Card, CardTitulo, Selo, Voltar } from "@/components/ui";
import { agoraBrasilia } from "@/lib/agenda";
import { exigirProfessor } from "@/lib/auth";
import { buscarVideo, listarModulos } from "@/lib/consultas";
import { dataBR } from "@/lib/formato";
import { ehShorts, urlCapa, urlPlayer } from "@/lib/video";

export const metadata: Metadata = { title: "Vídeo" };

/** "03/11 às 14:05" (horário de Brasília) */
function quando(iso: string) {
  const b = agoraBrasilia(new Date(iso));
  return `${dataBR(b.data).slice(0, 5)} às ${b.hora}`;
}

export default async function PaginaVideo(props: PageProps<"/videos/[id]">) {
  const professor = await exigirProfessor();
  const id = Number((await props.params).id);
  const [dados, modulos] = await Promise.all([buscarVideo(professor.id, id), listarModulos(professor.id)]);
  if (!dados) notFound();
  const { video, assistiu } = dados;
  const viram = assistiu.filter((a) => a.visualizacao);
  const faltam = assistiu.filter((a) => !a.visualizacao);
  const modulo = modulos.find((m) => m.id === video.moduloId);

  return (
    <>
      <Voltar href="/videos">Voltar para vídeos</Voltar>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{video.titulo}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-suave">
            {modulo?.nome ?? "Outros vídeos"} · <Selo>{video.origem === "youtube" ? "YouTube" : "Drive"}</Selo>
            {!video.paraTodos && <Selo>só alunos selecionados</Selo>}
          </p>
        </div>
        <div className="flex gap-2">
          <BotaoLink href={`/videos/${video.id}/editar`} variante="secundario" tamanho="sm">
            <Pencil /> Editar
          </BotaoLink>
          <BotaoAcao
            acao={excluirVideo.bind(null, video.id)}
            confirmar={`Excluir o vídeo “${video.titulo}”?`}
            detalhe="Some da área dos alunos. O arquivo no Drive/YouTube não é apagado."
            variante="perigo"
            tamanho="sm"
          >
            <Trash2 /> Excluir
          </BotaoAcao>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <PlayerVideo
            origem={video.origem}
            url={urlPlayer(video)}
            arquivo={video.origem === "drive" ? `/api/videos/${video.id}/arquivo` : null}
            capa={urlCapa(video)}
            vertical={ehShorts(video)}
            titulo={video.titulo}
          />
          {video.descricao && <p className="text-sm whitespace-pre-line text-suave">{video.descricao}</p>}
        </div>

        <Card className="self-start lg:col-span-2">
          <CardTitulo icone={<Eye />}>
            Quem assistiu ({viram.length} de {assistiu.length})
          </CardTitulo>
          {assistiu.length === 0 ? (
            <p className="p-5 text-sm text-suave">Nenhum aluno ativo pode ver este vídeo.</p>
          ) : (
            <ul className="divide-y divide-borda">
              {viram.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <CircleCheck className="size-4 shrink-0 text-emerald-600" />
                  <Link href={`/alunos/${a.id}`} className="min-w-0 flex-1 truncate hover:text-marca-texto">
                    {a.nome}
                  </Link>
                  <span className="text-right text-xs text-suave">
                    {quando(a.visualizacao!.primeiraVez)}
                    {a.visualizacao!.vezes > 1 && <span className="block">{a.visualizacao!.vezes} vezes</span>}
                  </span>
                </li>
              ))}
              {faltam.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm text-suave">
                  <CircleDashed className="size-4 shrink-0" />
                  <Link href={`/alunos/${a.id}`} className="min-w-0 flex-1 truncate hover:text-marca-texto">
                    {a.nome}
                  </Link>
                  <span className="text-xs">ainda não viu</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
