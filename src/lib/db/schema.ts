import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
});

export const alunos = sqliteTable("alunos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

export const recibos = sqliteTable("recibos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  numero: integer("numero").notNull().unique(),
  alunoId: integer("aluno_id")
    .notNull()
    .references(() => alunos.id, { onDelete: "cascade" }),
  valorCentavos: integer("valor_centavos").notNull(),
  referente: text("referente").notNull(),
  formaPagamento: text("forma_pagamento"),
  dataPagamento: text("data_pagamento").notNull(),
  observacoes: text("observacoes"),
  criadoEm: criadoEm(),
});

export const materiais = sqliteTable("materiais", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria"),
  arquivo: text("arquivo").notNull(), // nome salvo em disco
  nomeOriginal: text("nome_original").notNull(),
  tipo: text("tipo"),
  tamanho: integer("tamanho").notNull(),
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
export type StatusPresenca = Presenca["status"];
