import { usuarioAtual } from "@/lib/auth";
import { buscarProfessor, buscarRecibo } from "@/lib/consultas";
import { numeroRecibo } from "@/lib/formato";
import { pagadorDoRecibo } from "@/lib/pagador";
import { gerarReciboPdf } from "@/lib/recibo-pdf";

/** PDF do recibo (só o professor dono). */
export async function GET(request: Request, ctx: RouteContext<"/api/recibos/[id]">) {
  // recibos são só do professor (o aluno entra sem senha, então não vê documentos financeiros)
  const usuario = await usuarioAtual();
  if (usuario?.tipo !== "professor") return new Response("Não autorizado", { status: 401 });

  const id = Number((await ctx.params).id);
  const linha = await buscarRecibo(id, { professorId: usuario.professor.id });
  if (!linha) return new Response("Recibo não encontrado", { status: 404 });

  const pagador = pagadorDoRecibo(linha.aluno, linha.instituicao);
  const pdf = await gerarReciboPdf(linha.recibo, pagador, await buscarProfessor(linha.recibo.professorId));
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
