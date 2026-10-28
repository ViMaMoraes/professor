import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { gerarSenha } from "../senha";

// banco isolado e chave de notificação de teste (precisa vir antes de importar os módulos do banco)
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "professor-vencimentos-"));
const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
process.env.VAPID_PRIVATE_KEY = JSON.stringify(await crypto.subtle.exportKey("jwk", par.privateKey));

const { getDb, schema } = await import("../db");
const { avisarVencimentos, diasAte, precisaAvisar, textoVencimento } = await import("../vencimentos");

describe("senha provisória", () => {
  it("tem o tamanho pedido, só caracteres fáceis de ler, e não se repete", () => {
    const senhas = Array.from({ length: 200 }, () => gerarSenha());
    for (const s of senhas) expect(s).toMatch(/^[a-km-np-zA-HJ-NP-Z2-9]{10}$/);
    expect(new Set(senhas).size).toBe(200);
    expect(gerarSenha(16)).toHaveLength(16);
  });
});

describe("regras do vencimento", () => {
  const hoje = "2026-10-28";
  it("conta os dias e escreve o aviso", () => {
    expect(diasAte("2026-10-30", hoje)).toBe(2);
    expect(diasAte("2026-11-01", "2026-10-31")).toBe(1); // virada de mês
    expect(diasAte("2026-10-27", hoje)).toBe(-1);
    expect([0, 1, 2].map(textoVencimento)).toEqual(["vence hoje", "vence amanhã", "vence em 2 dias"]);
  });
  it("avisa só dentro de 2 dias, uma vez por data, e nunca do master ou de conta bloqueada", () => {
    const p = { master: false, ativo: true, acessoAte: "2026-10-30", vencimentoAvisado: null };
    expect(precisaAvisar(p, hoje)).toBe(true);
    expect(precisaAvisar({ ...p, acessoAte: "2026-10-31" }, hoje)).toBe(false); // 3 dias: ainda não
    expect(precisaAvisar({ ...p, acessoAte: "2026-10-27" }, hoje)).toBe(false); // já venceu
    expect(precisaAvisar({ ...p, vencimentoAvisado: "2026-10-30" }, hoje)).toBe(false); // já avisado
    expect(precisaAvisar({ ...p, vencimentoAvisado: "2026-09-30" }, hoje)).toBe(true); // renovou e vai vencer de novo
    expect(precisaAvisar({ ...p, master: true }, hoje)).toBe(false);
    expect(precisaAvisar({ ...p, ativo: false }, hoje)).toBe(false);
    expect(precisaAvisar({ ...p, acessoAte: null }, hoje)).toBe(false);
  });
});

describe("aviso de vencimento ao master", () => {
  const enviados: { url: string; headers: Record<string, string> }[] = [];
  let vence: number;

  beforeAll(async () => {
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      enviados.push({ url, headers: init.headers as Record<string, string> });
      return new Response(null, { status: 201 });
    });
    const db = await getDb();
    const [master] = await db
      .insert(schema.professores)
      .values([
        { nome: "Master", email: "m@x.com", senhaHash: "x", master: true },
        { nome: "Longe", email: "l@x.com", senhaHash: "x", acessoAte: "2026-12-01" },
        { nome: "Bloqueada", email: "b@x.com", senhaHash: "x", acessoAte: "2026-10-29", ativo: false },
      ])
      .returning();
    [{ id: vence }] = await db
      .insert(schema.professores)
      .values({ nome: "Marina Costa", email: "marina@x.com", senhaHash: "x", acessoAte: "2026-10-30" })
      .returning();
    await db.insert(schema.pushProfessores).values({ professorId: master.id, endpoint: "https://push.example/master", p256dh: "x", auth: "y" });
  });
  afterAll(() => vi.unstubAllGlobals());

  it("sem aparelho válido não marca como avisado (tenta de novo amanhã)", async () => {
    // a inscrição de teste tem chaves inválidas: o envio falha antes de sair
    expect((await avisarVencimentos("2026-10-28")).avisados).toEqual([]);
    const db = await getDb();
    expect((await db.query.professores.findFirst({ where: eq(schema.professores.id, vence) }))?.vencimentoAvisado).toBeNull();
  });

  it("avisa o master uma vez só por data de vencimento", async () => {
    const db = await getDb();
    const aparelho = crypto.getRandomValues(new Uint8Array(16));
    const chave = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    const p256dh = Buffer.from(await crypto.subtle.exportKey("raw", chave.publicKey)).toString("base64url");
    await db.update(schema.pushProfessores).set({ p256dh, auth: Buffer.from(aparelho).toString("base64url") });

    expect((await avisarVencimentos("2026-10-28")).avisados).toEqual(["Marina Costa"]);
    expect(enviados).toHaveLength(1);
    expect(enviados[0].url).toBe("https://push.example/master");
    expect((await db.query.professores.findFirst({ where: eq(schema.professores.id, vence) }))?.vencimentoAvisado).toBe("2026-10-30");

    // no dia seguinte não repete
    expect((await avisarVencimentos("2026-10-29")).avisados).toEqual([]);
    expect(enviados).toHaveLength(1);

    // renovou e vai vencer de novo: avisa da data nova
    await db.update(schema.professores).set({ acessoAte: "2026-11-30" }).where(eq(schema.professores.id, vence));
    expect((await avisarVencimentos("2026-11-28")).avisados).toEqual(["Marina Costa"]);
    expect(enviados).toHaveLength(2);
  });
});
