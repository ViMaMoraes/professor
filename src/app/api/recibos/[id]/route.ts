import { usuarioAtual } from "@/lib/auth";
import { buscarRecibo, professorPrincipal } from "@/lib/consultas";
import { numeroRecibo } from "@/lib/formato";
import { gerarReciboPdf } from "@/lib/recibo-pdf";

/** PDF do recibo. O professor vê todos; o aluno só os próprios. */
export async function GET(request: Request, ctx: RouteContext<"/api/recibos/[id]">) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autorizado", { status: 401 });

  const linha = await buscarRecibo(Number((await ctx.params).id));
  if (!linha || (usuario.tipo === "aluno" && linha.aluno.id !== usuario.aluno.id)) {
    return new Response("Recibo não encontrado", { status: 404 });
  }

  const pdf = await gerarReciboPdf(linha.recibo, linha.aluno, await professorPrincipal());
  const nome = `recibo-${numeroRecibo(linha.recibo.numero)}.pdf`;
  const baixar = new URL(request.url).searchParams.get("baixar") === "1";
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
