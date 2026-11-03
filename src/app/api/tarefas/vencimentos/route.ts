import { avisarMensalidades } from "@/lib/cobranca";
import { avisarVencimentos } from "@/lib/vencimentos";

/**
 * Tarefa diária (chamada pelo agendamento do Worker, veja worker.ts): avisa o master dos acessos perto de vencer
 * e cada professor das mensalidades que vencem hoje ou ficaram em atraso.
 * Só responde a quem conhece o SESSION_SECRET.
 */
export async function POST(request: Request) {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || request.headers.get("x-tarefa") !== segredo) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  // acesso dos professores perto de vencer (para o master) e mensalidades do dia (para cada professor)
  const [acessos, mensalidades] = await Promise.all([avisarVencimentos(), avisarMensalidades()]);
  return Response.json({ acessos, mensalidades });
}
