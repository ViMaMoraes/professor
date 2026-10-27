import { usuarioAtual } from "@/lib/auth";
import { alunoPodeBaixar, buscarMaterial } from "@/lib/consultas";
import { urlAbrir, urlBaixar, urlVer } from "@/lib/drive";

/**
 * Abre o material no Google Drive; ?baixar=1 baixa direto e ?ver=1 devolve a visualização
 * usada dentro do site (iframe).
 * O link só é entregue depois de conferir a permissão: o professor acessa os materiais dele; o aluno só os liberados para ele.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/materiais/[id]">) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autorizado", { status: 401 });

  const id = Number((await ctx.params).id);
  const material =
    usuario.tipo === "professor"
      ? await buscarMaterial(usuario.professor.id, id)
      : (await alunoPodeBaixar(id, usuario.aluno)) && (await buscarMaterial(null, id));
  if (!material) return new Response("Material não encontrado", { status: 404 });

  const params = new URL(request.url).searchParams;
  const destino =
    (params.get("ver") === "1" && urlVer(material)) || (params.get("baixar") === "1" && urlBaixar(material)) || urlAbrir(material);
  return new Response(null, { status: 302, headers: { Location: destino, "Cache-Control": "private, no-store" } });
}
