/**
 * Ponto de entrada do Worker na Cloudflare: o site (gerado pelo OpenNext em .open-next/worker.js)
 * mais as tarefas agendadas (triggers.crons no wrangler.jsonc).
 */
type Contexto = { waitUntil(promessa: Promise<unknown>): void };
type Ambiente = { SESSION_SECRET?: string };
type Site = { fetch(pedido: Request, env: Ambiente, ctx: Contexto): Promise<Response> };

// arquivo gerado pelo `opennextjs-cloudflare build` (pode não existir antes do build)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import site from "./.open-next/worker.js";

const app = site as Site;

// igual ao primeiro item de triggers.crons no wrangler.jsonc (8h17 em Brasília)
const CRON_DIARIO = "17 11 * * *";

const worker = {
  fetch: (pedido: Request, env: Ambiente, ctx: Contexto) => app.fetch(pedido, env, ctx),

  /**
   * Tarefas agendadas (triggers.crons no wrangler.jsonc):
   * - todo dia de manhã: acessos perto de vencer (master), mensalidades e aulas do dia (cada professor);
   * - a cada 15 minutos: lembrete da aula para os alunos.
   */
  async scheduled(evento: { cron?: string }, env: Ambiente, ctx: Contexto) {
    const tarefa = evento.cron === CRON_DIARIO ? "vencimentos" : "lembretes";
    // a tarefa roda dentro do próprio site (mesmo banco e código), protegida pelo SESSION_SECRET
    const pedido = new Request(`https://tarefas.interno/api/tarefas/${tarefa}`, {
      method: "POST",
      headers: { "x-tarefa": env.SESSION_SECRET ?? "" },
    });
    ctx.waitUntil(app.fetch(pedido, env, ctx).then(async (resposta) => console.log(`[tarefas] ${tarefa}`, resposta.status, await resposta.text())));
  },
};

export default worker;
