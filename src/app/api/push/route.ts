import { eq } from "drizzle-orm";
import { z } from "zod";

import { usuarioAtual } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

const Inscricao = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(5).max(100) }),
});

/**
 * Ativa as notificações neste aparelho: o aluno recebe avisos e materiais novos;
 * o professor (master) recebe o aviso de vencimento dos clientes.
 */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: "Não autorizado." }, { status: 401 });
  const dados = Inscricao.safeParse(await request.json().catch(() => null));
  if (!dados.success) return Response.json({ erro: "Inscrição inválida." }, { status: 400 });

  const { endpoint, keys } = dados.data;
  const db = await getDb();
  // o mesmo aparelho fica numa lista só (de quem está logado agora), para não receber avisos de outra conta
  if (usuario.tipo === "aluno") {
    await db.batch([
      db.delete(schema.pushProfessores).where(eq(schema.pushProfessores.endpoint, endpoint)),
      db
        .insert(schema.pushInscricoes)
        .values({ alunoId: usuario.aluno.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
        .onConflictDoUpdate({ target: schema.pushInscricoes.endpoint, set: { alunoId: usuario.aluno.id, p256dh: keys.p256dh, auth: keys.auth } }),
    ]);
  } else {
    const professorId = usuario.professor.id;
    await db.batch([
      db.delete(schema.pushInscricoes).where(eq(schema.pushInscricoes.endpoint, endpoint)),
      db
        .insert(schema.pushProfessores)
        .values({ professorId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
        .onConflictDoUpdate({ target: schema.pushProfessores.endpoint, set: { professorId, p256dh: keys.p256dh, auth: keys.auth } }),
    ]);
  }
  return Response.json({ ok: true });
}

/** Desativa as notificações deste aparelho. */
export async function DELETE(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: "Não autorizado." }, { status: 401 });
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (typeof endpoint === "string") {
    const db = await getDb();
    await db.batch([
      db.delete(schema.pushInscricoes).where(eq(schema.pushInscricoes.endpoint, endpoint)),
      db.delete(schema.pushProfessores).where(eq(schema.pushProfessores.endpoint, endpoint)),
    ]);
  }
  return Response.json({ ok: true });
}
