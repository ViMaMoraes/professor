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

const worker = {
  fetch: (pedido: Request, env: Ambiente, ctx: Contexto) => app.fetch(pedido, env, ctx),

  /** Uma vez por dia: avisa o master dos professores com acesso perto de vencer. */
  async scheduled(_evento: unknown, env: Ambiente, ctx: Contexto) {
    // a tarefa roda dentro do próprio site (mesmo banco e código), protegida pelo SESSION_SECRET
    const pedido = new Request("https://tarefas.interno/api/tarefas/vencimentos", {
      method: "POST",
      headers: { "x-tarefa": env.SESSION_SECRET ?? "" },
    });
    ctx.waitUntil(
      app.fetch(pedido, env, ctx).then(async (resposta) => console.log("[tarefas] vencimentos", resposta.status, await resposta.text())),
    );
  },
};

export default worker;
