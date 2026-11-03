import { enviarLembretesDeAula } from "@/lib/lembretes";

/**
 * Tarefa de 15 em 15 minutos (agendamento do Worker, veja worker.ts): lembrete da aula para os alunos.
 * Só responde a quem conhece o SESSION_SECRET.
 */
export async function POST(request: Request) {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || request.headers.get("x-tarefa") !== segredo) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  return Response.json(await enviarLembretesDeAula());
}
