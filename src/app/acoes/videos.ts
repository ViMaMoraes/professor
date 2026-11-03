"use server";

import { and, asc, eq, isNull, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAlunoComProfessor, exigirProfessor } from "@/lib/auth";
import { listarAlunos, videosDoAluno } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { notificarAlunos } from "@/lib/push";
import { lerLinkVideo } from "@/lib/video";

const { videos, videosAlunos, modulos, visualizacoes } = schema;

function revalidar() {
  revalidatePath("/videos");
  revalidatePath("/portal/videos");
}

/** Módulo do professor (ou null = "Outros vídeos"). */
async function moduloDoProfessor(professorId: number, valor: FormDataEntryValue | null) {
  const id = Number(valor);
  if (!id) return null;
  const db = await getDb();
  const m = await db.query.modulos.findFirst({ where: and(eq(modulos.id, id), eq(modulos.professorId, professorId)) });
  return m?.id ?? null;
}

/** Cria (id = null) ou edita um vídeo. Vídeo novo avisa no celular os alunos que podem ver. */
export async function salvarVideo(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const db = await getDb();
  const atual = id ? await db.query.videos.findFirst({ where: and(eq(videos.id, id), eq(videos.professorId, professor.id)) }) : undefined;
  if (id && !atual) return { erro: "Vídeo não encontrado." };

  const link = lerLinkVideo(texto(dados, "link"));
  const titulo = texto(dados, "titulo");
  const paraTodos = dados.get("destino") === "todos";
  const ativos = await listarAlunos(professor.id);
  const meus = new Set(ativos.map((a) => a.id));
  const alunoIds = [...new Set(dados.getAll("alunos").map(Number))].filter((a) => meus.has(a));
  if (!link) return { erro: "Cole o link de um vídeo do YouTube ou de um arquivo de vídeo do Google Drive." };
  if (!titulo) return { erro: "Informe o título do vídeo." };
  if (!paraTodos && alunoIds.length === 0) return { erro: "Escolha pelo menos um aluno ou marque “Todos os alunos”." };

  const moduloId = await moduloDoProfessor(professor.id, dados.get("moduloId"));
  const valores = { titulo, descricao: texto(dados, "descricao"), origem: link.origem, link: link.link, origemId: link.id, moduloId, paraTodos };

  let videoId = id;
  if (videoId) {
    // mudou de módulo: vai para o fim do módulo novo
    const ordem = atual!.moduloId === moduloId ? atual!.ordem : await proximaOrdem(professor.id, moduloId);
    await db
      .update(videos)
      .set({ ...valores, ordem })
      .where(and(eq(videos.id, videoId), eq(videos.professorId, professor.id)));
  } else {
    const [novo] = await db
      .insert(videos)
      .values({ ...valores, professorId: professor.id, ordem: await proximaOrdem(professor.id, moduloId) })
      .returning({ id: videos.id });
    videoId = novo.id;
  }
  await db.batch([
    db.delete(videosAlunos).where(eq(videosAlunos.videoId, videoId)),
    ...(!paraTodos && alunoIds.length ? [db.insert(videosAlunos).values(alunoIds.map((alunoId) => ({ videoId: videoId!, alunoId })))] : []),
  ]);

  if (!id) {
    await notificarAlunos(paraTodos ? ativos.map((a) => a.id) : alunoIds, { title: "Novo vídeo", body: titulo, url: `/portal/videos/${videoId}` });
  }
  revalidar();
  if (!id) return { ok: `Vídeo “${titulo}” publicado!`, criado: true };
  redirect(`/videos/${videoId}`);
}

async function proximaOrdem(professorId: number, moduloId: number | null) {
  const db = await getDb();
  const [linha] = await db
    .select({ maior: max(videos.ordem) })
    .from(videos)
    .where(and(eq(videos.professorId, professorId), moduloId ? eq(videos.moduloId, moduloId) : isNull(videos.moduloId)));
  return (linha?.maior ?? 0) + 1;
}

export async function excluirVideo(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(videos).where(and(eq(videos.id, id), eq(videos.professorId, professor.id)));
  revalidar();
  redirect("/videos");
}

/** Sobe ou desce o vídeo dentro do módulo. */
export async function moverVideo(id: number, direcao: -1 | 1) {
  const professor = await exigirProfessor();
  const db = await getDb();
  const video = await db.query.videos.findFirst({ where: and(eq(videos.id, id), eq(videos.professorId, professor.id)) });
  if (!video) return;
  const irmaos = await db
    .select({ id: videos.id })
    .from(videos)
    .where(and(eq(videos.professorId, professor.id), video.moduloId ? eq(videos.moduloId, video.moduloId) : isNull(videos.moduloId)))
    .orderBy(asc(videos.ordem), asc(videos.id));
  const ordem = trocarComVizinho(irmaos, id, direcao);
  if (!ordem) return;
  const comandos = ordem.map((vid, k) => db.update(videos).set({ ordem: k + 1 }).where(eq(videos.id, vid)));
  await db.batch(comandos as [(typeof comandos)[number], ...typeof comandos]);
  revalidar();
}

/** Nova ordem dos ids, com o item trocado de lugar com o vizinho (null se já está na ponta). */
function trocarComVizinho(lista: { id: number }[], id: number, direcao: -1 | 1) {
  const i = lista.findIndex((x) => x.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return null;
  const ids = lista.map((x) => x.id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
}

/** Cria (id = null) ou renomeia um módulo. */
export async function salvarModulo(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const nome = texto(dados, "nome");
  if (!nome) return { erro: "Dê um nome ao módulo." };
  const db = await getDb();
  if (id) {
    await db
      .update(modulos)
      .set({ nome, descricao: texto(dados, "descricao") })
      .where(and(eq(modulos.id, id), eq(modulos.professorId, professor.id)));
  } else {
    const [linha] = await db.select({ maior: max(modulos.ordem) }).from(modulos).where(eq(modulos.professorId, professor.id));
    await db.insert(modulos).values({ professorId: professor.id, nome, descricao: texto(dados, "descricao"), ordem: (linha?.maior ?? 0) + 1 });
  }
  revalidar();
  return { ok: id ? "Módulo atualizado." : `Módulo “${nome}” criado.` };
}

/** Exclui o módulo; os vídeos dele vão para "Outros vídeos". */
export async function excluirModulo(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(modulos).where(and(eq(modulos.id, id), eq(modulos.professorId, professor.id)));
  revalidar();
}

export async function moverModulo(id: number, direcao: -1 | 1) {
  const professor = await exigirProfessor();
  const db = await getDb();
  const lista = await db.select({ id: modulos.id }).from(modulos).where(eq(modulos.professorId, professor.id)).orderBy(asc(modulos.ordem), asc(modulos.id));
  const ordem = trocarComVizinho(lista, id, direcao);
  if (!ordem) return;
  const comandos = ordem.map((mid, k) => db.update(modulos).set({ ordem: k + 1 }).where(eq(modulos.id, mid)));
  await db.batch(comandos as [(typeof comandos)[number], ...typeof comandos]);
  revalidar();
}

/** O aluno abriu o vídeo: registra (primeira vez, última vez e quantas vezes). */
export async function registrarVisualizacao(videoId: number) {
  const { aluno } = await exigirAlunoComProfessor();
  const { videos: permitidos } = await videosDoAluno(aluno);
  if (!permitidos.some((v) => v.id === videoId)) return;
  const agora = new Date().toISOString();
  const db = await getDb();
  await db
    .insert(visualizacoes)
    .values({ videoId, alunoId: aluno.id, primeiraVez: agora, ultimaVez: agora })
    .onConflictDoUpdate({ target: [visualizacoes.videoId, visualizacoes.alunoId], set: { ultimaVez: agora, vezes: sql`${visualizacoes.vezes} + 1` } });
}
