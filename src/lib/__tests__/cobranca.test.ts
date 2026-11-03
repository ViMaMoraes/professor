import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

// banco isolado e chave de notificação de teste (antes de importar os módulos do banco)
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "professor-cobranca-"));
const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
process.env.VAPID_PRIVATE_KEY = JSON.stringify(await crypto.subtle.exportKey("jwk", par.privateKey));

const { getDb, schema } = await import("../db");
const { avisarMensalidades, resumoCobranca } = await import("../cobranca");

const enviados: { url: string; corpo: number }[] = [];
let prof: number;
let semAparelho: number;

async function aparelho() {
  const chave = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  return {
    p256dh: Buffer.from(await crypto.subtle.exportKey("raw", chave.publicKey)).toString("base64url"),
    auth: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url"),
  };
}

beforeAll(async () => {
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    enviados.push({ url, corpo: (init.body as Uint8Array).length });
    return new Response(null, { status: 201 });
  });
  const db = await getDb();
  [{ id: prof }, { id: semAparelho }] = await db
    .insert(schema.professores)
    .values([
      { nome: "Prof", email: "prof@x.com", senhaHash: "x", master: true },
      { nome: "Sem Aparelho", email: "sem@x.com", senhaHash: "x" },
    ])
    .returning({ id: schema.professores.id });
  await db.insert(schema.alunos).values([
    { professorId: prof, nome: "Vence Hoje", mensalidadeCentavos: 15000, diaVencimento: 12, dataInicio: "2026-01-01" },
    { professorId: prof, nome: "Venceu Ontem", mensalidadeCentavos: 20000, diaVencimento: 11, dataInicio: "2026-01-01" },
    { professorId: prof, nome: "Já Pagou", mensalidadeCentavos: 10000, diaVencimento: 12, dataInicio: "2026-01-01" },
    { professorId: semAparelho, nome: "Outro Aluno", mensalidadeCentavos: 10000, diaVencimento: 12, dataInicio: "2026-01-01" },
  ]);
  const [jaPagou] = await db.select().from(schema.alunos).where((await import("drizzle-orm")).eq(schema.alunos.nome, "Já Pagou"));
  await db.insert(schema.pagamentos).values({ professorId: prof, alunoId: jaPagou.id, referencia: "2026-11", valorCentavos: 10000, dataPagamento: "2026-11-02" });
  await db.insert(schema.pushProfessores).values({ professorId: prof, endpoint: "https://push.example/prof", ...(await aparelho()) });
});

describe("cobrança", () => {
  it("resumo: atrasados (inclusive de meses anteriores) e o que vence nos próximos dias", async () => {
    const r = await resumoCobranca(prof, "2026-11-12", 10);
    // outubro também está em aberto para os três (começaram em janeiro); novembro: só "Venceu Ontem" atrasado
    expect(r.atrasados.filter((l) => l.mes === "2026-11").map((l) => l.pagador.nome)).toEqual(["Venceu Ontem"]);
    expect(r.atrasados.filter((l) => l.mes === "2026-10").map((l) => l.pagador.nome).sort()).toEqual(["Já Pagou", "Vence Hoje", "Venceu Ontem"]);
    expect(r.vencendo.map((l) => l.pagador.nome)).toEqual(["Vence Hoje"]);
    expect(r.totalVencendo).toBe(15000);
  });

  it("notificação diária: só para quem tem aparelho, com o que vence hoje e o que atrasou ontem", async () => {
    const { avisados } = await avisarMensalidades("2026-11-12");
    expect(avisados).toEqual(["Prof"]);
    expect(enviados).toHaveLength(1);
    expect(enviados[0].url).toBe("https://push.example/prof");
    // sem nada vencendo hoje nem ontem, não manda nada
    expect((await avisarMensalidades("2026-11-20")).avisados).toEqual([]);
    expect(enviados).toHaveLength(1);
  });
});

describe("texto da notificação", async () => {
  const { textoAvisoMensalidades } = await import("../cobranca");
  const linha = (nome: string, falta: number, vencimento = "2026-11-12") =>
    ({ pagador: { nome }, faltaCentavos: falta, vencimento }) as Parameters<typeof textoAvisoMensalidades>[0][number];
  it("uma que vence hoje", () => {
    expect(textoAvisoMensalidades([linha("Ana Souza", 15000)], [])).toEqual({
      title: "Hoje vence a mensalidade de Ana Souza",
      body: "R$ 150,00 · Novembro de 2026.",
    });
  });
  it("várias hoje e uma atrasada desde ontem", () => {
    expect(textoAvisoMensalidades([linha("Ana", 15000), linha("Carla", 25000)], [linha("Bruno", 20000)])).toEqual({
      title: "Hoje vencem 2 mensalidades",
      body: "Vencem hoje: Ana (R$ 150,00), Carla (R$ 250,00). Em atraso desde ontem: Bruno (R$ 200,00).",
    });
  });
  it("só atrasadas", () => {
    expect(textoAvisoMensalidades([], [linha("Bruno", 20000)]).title).toBe("Mensalidade de Bruno em atraso");
  });
});
