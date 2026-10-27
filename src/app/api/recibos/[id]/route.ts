import { usuarioAtual } from "@/lib/auth";
import { buscarProfessor, buscarRecibo } from "@/lib/consultas";
import { numeroRecibo } from "@/lib/formato";
import { gerarReciboPdf } from "@/lib/recibo-pdf";

/** PDF do recibo. O professor vê os recibos dele; o aluno só os próprios. */
export async function GET(request: Request, ctx: RouteContext<"/api/recibos/[id]">) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autorizado", { status: 401 });

  const id = Number((await ctx.params).id);
  const dono = usuario.tipo === "professor" ? { professorId: usuario.professor.id } : { alunoId: usuario.aluno.id };
  const linha = await buscarRecibo(id, dono);
  if (!linha) return new Response("Recibo não encontrado", { status: 404 });

  const pdf = await gerarReciboPdf(linha.recibo, linha.aluno, await buscarProfessor(linha.recibo.professorId));
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
