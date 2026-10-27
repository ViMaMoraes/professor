/** `npm run demo`: popula um banco vazio com dados de exemplo. */
import bcrypt from "bcryptjs";

import { getDb, schema } from "../lib/db";
import { lerLinkDrive } from "../lib/drive";
import { hojeISO, somarDias } from "../lib/formato";

async function main() {
  const db = await getDb();
  if (await db.query.professores.findFirst()) {
    console.log("O banco já tem dados; o demo só roda num banco vazio.");
    return;
  }

  const [professor] = await db
    .insert(schema.professores)
    .values({
      master: true,
      nome: "Professor Exemplo",
      email: "professor@exemplo.com",
      senhaHash: await bcrypt.hash("professor", 10),
      documento: "123.456.789-00",
      telefone: "(11) 99999-0000",
      cidade: "São Paulo/SP",
      chavePix: "professor@exemplo.com",
    })
    .returning();

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
        professorId: professor.id,
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
        professorId: professor.id,
        numero: numero++,
        alunoId: aluno.id,
        valorCentavos: aluno.mensalidadeCentavos!,
        referente: "aulas de música - mensalidade",
        formaPagamento: "Pix",
        dataPagamento: data,
      });
    }
  }

  // uma instituição que paga por dois alunos: recibo no nome dela, chamada de cada aluno
  const [escola] = await db
    .insert(schema.instituicoes)
    .values({
      professorId: professor.id,
      nome: "Escola Villa-Lobos",
      documento: "12.345.678/0001-90",
      contato: "Coordenadora Sílvia",
      telefone: "(11) 3333-4444",
      valorMensalCentavos: 60000,
    })
    .returning();
  const daEscola = await db
    .insert(schema.alunos)
    .values(
      ["Fernanda Reis", "Gabriel Souza"].map((nome) => ({
        professorId: professor.id,
        instituicaoId: escola.id,
        nome,
        instrumento: "Flauta",
        diaAula: "Terça",
        horario: "14:00",
      })),
    )
    .returning();
  for (let s = 1; s <= 3; s++) {
    const terca = somarDias(segunda, 1 - 7 * s);
    await db.insert(schema.presencas).values([
      { alunoId: daEscola[0].id, data: terca, status: "presente" },
      { alunoId: daEscola[1].id, data: terca, status: s === 1 ? "falta" : "presente" },
    ]);
  }
  await db.insert(schema.recibos).values({
    professorId: professor.id,
    numero: numero++,
    instituicaoId: escola.id,
    valorCentavos: 60000,
    referente: "aulas de música - alunos: Fernanda Reis, Gabriel Souza",
    formaPagamento: "Transferência",
    dataPagamento: hoje,
  });

  // links de exemplo (IDs fictícios): troque pelos links reais do seu Drive
  const exemplos = [
    {
      titulo: "Escalas maiores - guia",
      categoria: "Teoria",
      paraTodos: true,
      para: [] as number[],
      link: "https://drive.google.com/file/d/1ExemploEscalasMaiores000000000/view?usp=sharing",
    },
    {
      titulo: "Asa Branca - cifra",
      categoria: "Partitura",
      paraTodos: false,
      para: [alunos[0].id],
      link: "https://drive.google.com/file/d/1ExemploAsaBrancaCifra0000000000/view?usp=sharing",
    },
    {
      titulo: "Playbacks de rock",
      categoria: "Áudio / Playback",
      paraTodos: false,
      para: [alunos[1].id, alunos[3].id],
      link: "https://drive.google.com/drive/folders/1ExemploPastaPlaybacks000000000?usp=sharing",
    },
  ];
  for (const ex of exemplos) {
    const drive = lerLinkDrive(ex.link)!;
    const [material] = await db
      .insert(schema.materiais)
      .values({
        professorId: professor.id,
        titulo: ex.titulo,
        categoria: ex.categoria,
        paraTodos: ex.paraTodos,
        link: drive.link,
        tipoDrive: drive.tipo,
        driveId: drive.id,
      })
      .returning();
    if (ex.para.length) {
      await db.insert(schema.materiaisAlunos).values(ex.para.map((alunoId) => ({ materialId: material.id, alunoId })));
    }
  }

  // uma segunda professora (cliente), com um aluno, para ver que um professor não enxerga os dados do outro
  const [outra] = await db
    .insert(schema.professores)
    .values({
      nome: "Marina Costa",
      email: "marina@exemplo.com",
      senhaHash: await bcrypt.hash("professor", 10),
      acessoAte: somarDias(hoje, 30),
    })
    .returning();
  await db.insert(schema.alunos).values({
    professorId: outra.id,
    nome: "Lucas Prado",
    instrumento: "Canto",
    diaAula: "Quinta",
    email: "lucas@exemplo.com",
    senhaHash: senhaAluno,
  });

  console.log(
    "Pronto! Master: professor@exemplo.com / professor · Outra professora: marina@exemplo.com / professor · Alunos: ana@exemplo.com (etc.) / aluno123",
  );
}

main();
