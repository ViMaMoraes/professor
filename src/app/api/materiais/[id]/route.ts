import fs from "node:fs";
import { Readable } from "node:stream";

import { usuarioAtual } from "@/lib/auth";
import { caminhoUpload } from "@/lib/caminhos";
import { alunoPodeBaixar, buscarMaterial } from "@/lib/consultas";

/** Download de material. O professor baixa qualquer um; o aluno só os liberados para ele. */
export async function GET(_: Request, ctx: RouteContext<"/api/materiais/[id]">) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autorizado", { status: 401 });

  const id = Number((await ctx.params).id);
  const material = await buscarMaterial(id);
  const permitido = material && (usuario.tipo === "professor" || (await alunoPodeBaixar(id, usuario.aluno.id)));
  if (!material || !permitido) return new Response("Material não encontrado", { status: 404 });

  const caminho = caminhoUpload(material.arquivo);
  if (!fs.existsSync(caminho)) return new Response("Arquivo não encontrado", { status: 404 });

  const corpo = Readable.toWeb(fs.createReadStream(caminho)) as ReadableStream;
  return new Response(corpo, {
    headers: {
      "Content-Type": material.tipo || "application/octet-stream",
      "Content-Length": String(material.tamanho),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(material.nomeOriginal)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
