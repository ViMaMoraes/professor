import { usuarioAtual } from "@/lib/auth";
import { alunoPodeBaixar, buscarMaterial } from "@/lib/consultas";
import { urlAbrir, urlBaixar } from "@/lib/drive";

/**
 * Abre (ou baixa, com ?baixar=1) o material no Google Drive.
 * O link só é entregue depois de conferir a permissão: o professor acessa todos; o aluno só os liberados para ele.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/materiais/[id]">) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autorizado", { status: 401 });

  const id = Number((await ctx.params).id);
  const material = await buscarMaterial(id);
  const permitido = material && (usuario.tipo === "professor" || (await alunoPodeBaixar(id, usuario.aluno.id)));
  if (!material || !permitido) return new Response("Material não encontrado", { status: 404 });

  const baixar = new URL(request.url).searchParams.get("baixar") === "1";
  const destino = (baixar && urlBaixar(material)) || urlAbrir(material);
  return new Response(null, { status: 302, headers: { Location: destino, "Cache-Control": "private, no-store" } });
}
