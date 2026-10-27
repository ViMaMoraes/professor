import { eq } from "drizzle-orm";
import { z } from "zod";

import { usuarioAtual } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

const Inscricao = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(5).max(100) }),
});

/** O aluno ativa as notificações neste aparelho. */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (usuario?.tipo !== "aluno") return Response.json({ erro: "Não autorizado." }, { status: 401 });
  const dados = Inscricao.safeParse(await request.json().catch(() => null));
  if (!dados.success) return Response.json({ erro: "Inscrição inválida." }, { status: 400 });

  const { endpoint, keys } = dados.data;
  const db = await getDb();
  await db
    .insert(schema.pushInscricoes)
    .values({ alunoId: usuario.aluno.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({ target: schema.pushInscricoes.endpoint, set: { alunoId: usuario.aluno.id, p256dh: keys.p256dh, auth: keys.auth } });
  return Response.json({ ok: true });
}

/** Desativa as notificações deste aparelho. */
export async function DELETE(request: Request) {
  const usuario = await usuarioAtual();
  if (usuario?.tipo !== "aluno") return Response.json({ erro: "Não autorizado." }, { status: 401 });
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) {
    const db = await getDb();
    await db.delete(schema.pushInscricoes).where(eq(schema.pushInscricoes.endpoint, endpoint));
  }
  return Response.json({ ok: true });
}
