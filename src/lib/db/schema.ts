import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const criadoEm = () =>
  text("criado_em")
    .notNull()
    .default(sql`(datetime('now', 'localtime'))`);

export const professores = sqliteTable("professores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  // dados que aparecem no recibo
  documento: text("documento"),
  telefone: text("telefone"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  chavePix: text("chave_pix"),
  // administração da plataforma
  master: integer("master", { mode: "boolean" }).notNull().default(false), // administra os outros professores
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true), // conta liberada
  acessoAte: text("acesso_ate"), // AAAA-MM-DD; vazio = sem data de validade
  criadoEm: text("criado_em").$defaultFn(() => new Date().toISOString().slice(0, 10)),
});

/** Coluna que liga cada registro ao professor dono (cada professor só enxerga os próprios dados). */
const professorId = () =>
  integer("professor_id")
    .notNull()
    .references(() => professores.id, { onDelete: "cascade" });

/**
 * Quem paga por vários alunos de uma vez (escola, igreja, projeto social, família...).
 * O recibo pode sair no nome dela; a chamada continua sendo de cada aluno.
 */
export const instituicoes = sqliteTable(
  "instituicoes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    professorId: professorId(),
    nome: text("nome").notNull(),
    documento: text("documento"), // CNPJ ou CPF
    contato: text("contato"), // pessoa responsável
    email: text("email"),
    telefone: text("telefone"),
    endereco: text("endereco"),
    valorMensalCentavos: integer("valor_mensal_centavos"),
    observacoes: text("observacoes"),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    criadoEm: criadoEm(),
  },
  (t) => [index("instituicoes_professor").on(t.professorId)],
);

export const alunos = sqliteTable("alunos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  professorId: professorId(),
  // instituição que paga por este aluno (opcional)
  instituicaoId: integer("instituicao_id").references(() => instituicoes.id, { onDelete: "set null" }),
  nome: text("nome").notNull(),
  email: text("email").unique(),
  senhaHash: text("senha_hash"),
  telefone: text("telefone"),
  responsavel: text("responsavel"),
  dataNascimento: text("data_nascimento"), // AAAA-MM-DD
  instrumento: text("instrumento"),
  nivel: text("nivel"),
  diaAula: text("dia_aula"),
  horario: text("horario"),
  mensalidadeCentavos: integer("mensalidade_centavos"),
  dataInicio: text("data_inicio"),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  observacoes: text("observacoes"),
  criadoEm: criadoEm(),
});

export const presencas = sqliteTable(
  "presencas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
    data: text("data").notNull(),
    status: text("status", { enum: ["presente", "falta", "justificada", "reposicao"] }).notNull(),
    observacao: text("observacao"),
  },
  (t) => [uniqueIndex("presenca_aluno_data").on(t.alunoId, t.data)],
);

export const recibos = sqliteTable(
  "recibos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    professorId: professorId(),
    numero: integer("numero").notNull(), // sequencial por professor
    // o recibo é de um aluno OU de uma instituição (exatamente um dos dois)
    alunoId: integer("aluno_id").references(() => alunos.id, { onDelete: "cascade" }),
    instituicaoId: integer("instituicao_id").references(() => instituicoes.id, { onDelete: "cascade" }),
    valorCentavos: integer("valor_centavos").notNull(),
    referente: text("referente").notNull(),
    formaPagamento: text("forma_pagamento"),
    dataPagamento: text("data_pagamento").notNull(),
    observacoes: text("observacoes"),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("recibos_professor_numero").on(t.professorId, t.numero)],
);

export const materiais = sqliteTable("materiais", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  professorId: professorId(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria"),
  link: text("link").notNull(), // link de compartilhamento do Google Drive
  tipoDrive: text("tipo_drive", { enum: ["arquivo", "pasta", "documento"] }).notNull(),
  driveId: text("drive_id").notNull(),
  paraTodos: integer("para_todos", { mode: "boolean" }).notNull().default(false),
  criadoEm: criadoEm(),
});

export const materiaisAlunos = sqliteTable(
  "materiais_alunos",
  {
    materialId: integer("material_id")
      .notNull()
      .references(() => materiais.id, { onDelete: "cascade" }),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.materialId, t.alunoId] })],
);

export type Professor = typeof professores.$inferSelect;
export type Aluno = typeof alunos.$inferSelect;
export type Presenca = typeof presencas.$inferSelect;
export type Recibo = typeof recibos.$inferSelect;
export type Material = typeof materiais.$inferSelect;
export type Instituicao = typeof instituicoes.$inferSelect;
export type StatusPresenca = Presenca["status"];
export type TipoDrive = Material["tipoDrive"];
