import { avisarMensalidades } from "@/lib/cobranca";
import { avisarAulasDoDia } from "@/lib/lembretes";
import { avisarVencimentos } from "@/lib/vencimentos";

/**
 * Tarefa diária (chamada pelo agendamento do Worker, veja worker.ts): avisa o master dos acessos perto de vencer
 * e cada professor das mensalidades que vencem hoje ou ficaram em atraso e das aulas do dia.
 * Só responde a quem conhece o SESSION_SECRET.
 */
export async function POST(request: Request) {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || request.headers.get("x-tarefa") !== segredo) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  // acesso dos professores perto de vencer (para o master); mensalidades e aulas do dia (para cada professor)
  const [acessos, mensalidades, aulas] = await Promise.all([avisarVencimentos(), avisarMensalidades(), avisarAulasDoDia()]);
  return Response.json({ acessos, mensalidades, aulas });
}
