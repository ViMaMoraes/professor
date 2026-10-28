import { avisarVencimentos } from "@/lib/vencimentos";

/**
 * Tarefa diária (chamada pelo agendamento do Worker, veja worker.ts): avisa o master dos acessos perto de vencer.
 * Só responde a quem conhece o SESSION_SECRET.
 */
export async function POST(request: Request) {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || request.headers.get("x-tarefa") !== segredo) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  return Response.json(await avisarVencimentos());
}
