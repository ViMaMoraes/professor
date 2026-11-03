import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "professor-lembretes-"));
const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
process.env.VAPID_PRIVATE_KEY = JSON.stringify(await crypto.subtle.exportKey("jwk", par.privateKey));

const { getDb, schema } = await import("../db");
const { enviarLembretesDeAula, avisarAulasDoDia } = await import("../lembretes");
const { agendaDoPeriodo } = await import("../consultas");

const enviados: string[] = [];
async function aparelho(endpoint: string) {
  const chave = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  return {
    endpoint,
    p256dh: Buffer.from(await crypto.subtle.exportKey("raw", chave.publicKey)).toString("base64url"),
    auth: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url"),
  };
}
// Brasília = UTC-3: 16:00 em Brasília = 19:00 UTC
const utc = (dataHora: string) => new Date(`${dataHora}:00Z`);
let professor: { id: number; duracaoAula: number };

beforeAll(async () => {
  vi.stubGlobal("fetch", async (url: string) => {
    enviados.push(url);
    return new Response(null, { status: 201 });
  });
  const db = await getDb();
  const [p] = await db.insert(schema.professores).values({ nome: "Marcus Moraes", email: "p@x.com", senhaHash: "x", lembreteMinutos: 120 }).returning();
  professor = p;
  const [ana, bruno, carla] = await db
    .insert(schema.alunos)
    .values([
      { professorId: p.id, nome: "Ana Souza" },
      { professorId: p.id, nome: "Bruno Lima" },
      { professorId: p.id, nome: "Carla Sem App" },
    ])
    .returning();
  // segunda 09/11/2026: Ana 18:00 e Bruno 18:00 (desmarcada); Carla 18:00 sem aparelho
  await db.insert(schema.horarios).values([
    { alunoId: ana.id, diaSemana: 1, hora: "18:00" },
    { alunoId: bruno.id, diaSemana: 1, hora: "18:00" },
    { alunoId: carla.id, diaSemana: 1, hora: "18:00" },
  ]);
  await db.insert(schema.aulasDesmarcadas).values({ professorId: p.id, alunoId: bruno.id, data: "2026-11-09", hora: "18:00", por: "professor" });
  // reposição da Ana na terça 10/11 às 10:00
  await db.insert(schema.reposicoes).values({ professorId: p.id, alunoId: ana.id, data: "2026-11-10", hora: "10:00" });
  await db.insert(schema.pushInscricoes).values([
    { alunoId: ana.id, ...(await aparelho("https://push.example/ana")) },
    { alunoId: bruno.id, ...(await aparelho("https://push.example/bruno")) },
  ]);
  await db.insert(schema.pushProfessores).values({ professorId: p.id, ...(await aparelho("https://push.example/professor")) });
});

describe("lembretes de aula", () => {
  it("agenda do dia: aula fixa, desmarcada e reposição", async () => {
    const agenda = await agendaDoPeriodo(professor, "2026-11-09", "2026-11-10");
    expect(agenda.map((o) => `${o.data} ${o.hora} ${o.nome} ${o.tipo}${o.desmarcada ? " desmarcada" : ""}`)).toEqual([
      "2026-11-09 18:00 Ana Souza aula",
      "2026-11-09 18:00 Bruno Lima aula desmarcada",
      "2026-11-09 18:00 Carla Sem App aula",
      "2026-11-10 10:00 Ana Souza reposicao",
    ]);
  });

  it("2 horas antes avisa só quem tem aula, tem aparelho e não foi desmarcado; não repete", async () => {
    expect((await enviarLembretesDeAula(utc("2026-11-09T18:45"))).enviados).toEqual([]); // 15:45 em Brasília: cedo
    expect((await enviarLembretesDeAula(utc("2026-11-09T19:00"))).enviados).toEqual(["Ana Souza 2026-11-09 18:00"]);
    expect((await enviarLembretesDeAula(utc("2026-11-09T19:15"))).enviados).toEqual([]); // já avisada
    expect(enviados).toEqual(["https://push.example/ana"]);
  });

  it("reposição também tem lembrete", async () => {
    expect((await enviarLembretesDeAula(utc("2026-11-10T11:00"))).enviados).toEqual(["Ana Souza 2026-11-10 10:00"]); // 08:00 em Brasília
  });

  it("resumo da manhã para o professor", async () => {
    const antes = enviados.length;
    expect((await avisarAulasDoDia(utc("2026-11-09T11:17"))).avisados).toEqual(["Marcus Moraes"]);
    expect(enviados.slice(antes)).toEqual(["https://push.example/professor"]);
    // dia sem aulas: nada
    expect((await avisarAulasDoDia(utc("2026-11-11T11:17"))).avisados).toEqual([]);
  });
});
