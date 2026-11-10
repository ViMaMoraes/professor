import { and, eq } from "drizzle-orm";

import { professorPodeVer, usuarioAtual } from "@/lib/auth";
import { videosDoAluno } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { buscarVideoDrive, chaveGoogle } from "@/lib/video-drive";

/** Arquivo do vídeo do Drive para o player do site. Só para o professor dono ou o aluno liberado. */
export async function GET(request: Request, ctx: RouteContext<"/api/videos/[id]/arquivo">) {
  const chave = chaveGoogle();
  const usuario = await usuarioAtual();
  if (!usuario) return new Response(null, { status: 401 });
  // equipe de estúdio: só com o módulo liberado
  if (usuario.tipo === "professor" && !professorPodeVer(usuario, "videos")) return new Response(null, { status: 403 });
  const id = Number((await ctx.params).id);

  let video: { origem: string; origemId: string; link: string } | undefined;
  if (usuario.tipo === "professor") {
    const db = await getDb();
    video = await db.query.videos.findFirst({ where: and(eq(schema.videos.id, id), eq(schema.videos.professorId, usuario.professor.id)) });
  } else {
    video = (await videosDoAluno(usuario.aluno)).videos.find((v) => v.id === id);
  }
  if (!video || video.origem !== "drive") return new Response(null, { status: 404 });
  return buscarVideoDrive(video, request, chave);
}
