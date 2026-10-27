import { z } from "zod";

import { usuarioAtual } from "@/lib/auth";
import { buscarMateriaisPorIds, materiaisDoAluno } from "@/lib/consultas";
import { limparNomeArquivo, montarLote } from "@/lib/drive-lote";

const Pedido = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
  formato: z.enum(["zip", "pdf"]),
  nome: z.string().max(200).optional(),
});

// buscar vários arquivos no Drive pode demorar
export const maxDuration = 300;

/**
 * Download em lote: busca os materiais escolhidos no Drive e devolve um ZIP ou um PDF único.
 * O aluno só consegue incluir materiais liberados para ele.
 * O cabeçalho X-Materiais-Falhas traz (em JSON, codificado) os títulos que não puderam entrar.
 */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const pedido = Pedido.safeParse(await request.json().catch(() => null));
  if (!pedido.success) return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  const { ids, formato, nome } = pedido.data;

  const permitidos =
    usuario.tipo === "professor"
      ? await buscarMateriaisPorIds(usuario.professor.id, ids)
      : (await materiaisDoAluno(usuario.aluno)).filter((m) => ids.includes(m.id));
  if (permitidos.length === 0) return Response.json({ erro: "Nenhum material encontrado." }, { status: 404 });

  const { dados, falhas } = await montarLote(permitidos, formato);
  if (!dados) {
    return Response.json(
      {
        erro: "Não foi possível baixar nenhum dos arquivos. Confira se estão compartilhados como “qualquer pessoa com o link” no Drive.",
        falhas,
      },
      { status: 422 },
    );
  }

  const arquivo = `${limparNomeArquivo(nome ?? "")}.${formato}`;
  return new Response(Buffer.from(dados), {
    headers: {
      "Content-Type": formato === "zip" ? "application/zip" : "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(arquivo)}`,
      "X-Materiais-Falhas": encodeURIComponent(JSON.stringify(falhas)),
      "Cache-Control": "private, no-store",
    },
  });
}
