/** `npm run demo`: popula um banco vazio com dados de exemplo. */
import fs from "node:fs/promises";

import bcrypt from "bcryptjs";

import { caminhoUpload, PASTA_UPLOADS } from "../lib/caminhos";
import { getDb, schema } from "../lib/db";
import { hojeISO, somarDias } from "../lib/formato";

async function main() {
  const db = await getDb();
  if (await db.query.professores.findFirst()) {
    console.log("O banco já tem dados; o demo só roda num banco vazio.");
    return;
  }

  await db.insert(schema.professores).values({
    nome: "Professor Exemplo",
    email: "professor@exemplo.com",
    senhaHash: await bcrypt.hash("professor", 10),
    documento: "123.456.789-00",
    telefone: "(11) 99999-0000",
    cidade: "São Paulo/SP",
    chavePix: "professor@exemplo.com",
  });

  const hoje = hojeISO();
  const senhaAluno = await bcrypt.hash("aluno123", 10);
  const dados = [
    ["Ana Souza", "Violão", "Iniciante", "Segunda", "18:00", 18000, null],
    ["Bruno Lima", "Guitarra", "Intermediário", "Segunda", "19:00", 20000, null],
    ["Carla Dias", "Piano", "Básico", "Quarta", "17:00", 22000, "Marina Dias"],
    ["Diego Alves", "Bateria", "Avançado", "Sábado", "10:00", 25000, null],
  ] as const;
  const alunos = await db
    .insert(schema.alunos)
    .values(
      dados.map(([nome, instrumento, nivel, diaAula, horario, mensalidadeCentavos, responsavel], i) => ({
        nome,
        instrumento,
        nivel,
        diaAula,
        horario,
        mensalidadeCentavos,
        responsavel,
        telefone: `(11) 98888-000${i + 1}`,
        email: `${nome.split(" ")[0].toLowerCase()}@exemplo.com`,
        senhaHash: senhaAluno,
        dataInicio: somarDias(hoje, -90 * (i + 1)),
      })),
    )
    .returning();

  // quatro segundas-feiras anteriores
  const diaDaSemana = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const segunda = somarDias(hoje, -((diaDaSemana + 6) % 7));
  for (let s = 1; s <= 4; s++) {
    const data = somarDias(segunda, -7 * s);
    await db.insert(schema.presencas).values([
      { alunoId: alunos[0].id, data, status: "presente" },
      { alunoId: alunos[1].id, data, status: s === 2 ? "falta" : "presente", observacao: s === 2 ? "Avisou que estava doente" : null },
    ]);
  }

  // recibos dos últimos meses para o gráfico do painel
  let numero = 1;
  for (let m = 3; m >= 0; m--) {
    const [a, mes] = hoje.split("-").map(Number);
    const data = new Date(Date.UTC(a, mes - 1 - m, 5)).toISOString().slice(0, 10);
    if (data > hoje) continue;
    for (const aluno of alunos.slice(0, m === 0 ? 3 : 4)) {
      await db.insert(schema.recibos).values({
        numero: numero++,
        alunoId: aluno.id,
        valorCentavos: aluno.mensalidadeCentavos!,
        referente: "aulas de música - mensalidade",
        formaPagamento: "Pix",
        dataPagamento: data,
      });
    }
  }

  await fs.mkdir(PASTA_UPLOADS, { recursive: true });
  const exemplos = [
    { titulo: "Escalas maiores - guia", categoria: "Teoria", paraTodos: true, para: [] as number[] },
    { titulo: "Asa Branca - cifra", categoria: "Partitura", paraTodos: false, para: [alunos[0].id] },
  ];
  for (const ex of exemplos) {
    const arquivo = `${crypto.randomUUID()}.txt`;
    const conteudo = `${ex.titulo}\n(arquivo de exemplo)\n`;
    await fs.writeFile(caminhoUpload(arquivo), conteudo);
    const [material] = await db
      .insert(schema.materiais)
      .values({
        titulo: ex.titulo,
        categoria: ex.categoria,
        paraTodos: ex.paraTodos,
        arquivo,
        nomeOriginal: `${ex.titulo}.txt`,
        tipo: "text/plain",
        tamanho: Buffer.byteLength(conteudo),
      })
      .returning();
    if (ex.para.length) {
      await db.insert(schema.materiaisAlunos).values(ex.para.map((alunoId) => ({ materialId: material.id, alunoId })));
    }
  }

  console.log("Pronto! Professor: professor@exemplo.com / professor · Alunos: ana@exemplo.com (etc.) / aluno123");
}

main();
