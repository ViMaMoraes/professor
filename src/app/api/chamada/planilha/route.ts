import { usuarioAtual } from "@/lib/auth";
import { historicoPresencas } from "@/lib/consultas";
import { hojeISO, isoValido } from "@/lib/formato";
import { gerarPlanilhaChamada } from "@/lib/planilha-chamada";

/** Exporta a chamada do período em Excel (.xlsx): ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&aluno=ID (opcional). */
export async function GET(request: Request) {
  const usuario = await usuarioAtual();
  if (usuario?.tipo !== "professor") return new Response("Não autorizado", { status: 401 });

  const params = new URL(request.url).searchParams;
  const hoje = hojeISO();
  const inicio = isoValido(params.get("inicio")) ? params.get("inicio")! : hoje.slice(0, 8) + "01";
  const fim = isoValido(params.get("fim")) ? params.get("fim")! : hoje;
  const alunoId = Number(params.get("aluno")) || undefined;

  const linhas = await historicoPresencas(inicio, fim, alunoId);
  const registros = linhas.map(({ presenca, aluno }) => ({ ...presenca, aluno }));
  const arquivo = await gerarPlanilhaChamada(registros, { inicio, fim });

  const nome = alunoId && registros[0] ? `chamada ${registros[0].aluno.nome} ${inicio} a ${fim}` : `chamada ${inicio} a ${fim}`;
  return new Response(Buffer.from(arquivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nome)}.xlsx`,
      "Cache-Control": "private, no-store",
    },
  });
}
