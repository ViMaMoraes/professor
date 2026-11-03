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
  rg: text("rg"),
  chavePix: text("chave_pix"),
  diaVencimento: integer("dia_vencimento").notNull().default(10), // dia padrão das mensalidades (1 a 28)
  duracaoAula: integer("duracao_aula").notNull().default(60), // minutos, padrão dos horários
  lembreteMinutos: integer("lembrete_minutos").notNull().default(120), // aviso ao aluno antes da aula; 0 = desligado
  assinatura: text("assinatura"), // imagem PNG (data URL) que vai no recibo
  // administração da plataforma
  master: integer("master", { mode: "boolean" }).notNull().default(false), // administra os outros professores
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true), // conta liberada
  acessoAte: text("acesso_ate"), // AAAA-MM-DD; vazio = sem data de validade
  trocarSenha: integer("trocar_senha", { mode: "boolean" }).notNull().default(false), // senha provisória: troca no próximo login
  vencimentoAvisado: text("vencimento_avisado"), // acessoAte que já gerou o aviso de vencimento para o master
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
    diaVencimento: integer("dia_vencimento"), // vazio = dia padrão do professor
    // texto do recibo: "recebi {tratamento} {nome} ... referente {descricaoRecibo}"
    tratamento: text("tratamento"), // "da", "do" ou "de"
    descricaoRecibo: text("descricao_recibo"), // ex.: "às aulas de violino"
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
  email: text("email"),
  // login do aluno (só usuário, sem senha); vazio = sem acesso aos downloads
  usuario: text("usuario").unique(),
  senhaHash: text("senha_hash"), // não é mais usada (o aluno entra só com o usuário); mantida para não recriar a tabela
  descricaoRecibo: text("descricao_recibo"), // ex.: "às aulas de violino"
  mensagem: text("mensagem"), // recado do professor que aparece em destaque no acesso do aluno
  telefone: text("telefone"),
  responsavel: text("responsavel"),
  dataNascimento: text("data_nascimento"), // AAAA-MM-DD
  instrumento: text("instrumento"),
  nivel: text("nivel"),
  // antigos (um dia e horário só): os horários agora ficam na tabela `horarios`
  diaAula: text("dia_aula"),
  horario: text("horario"),
  mensalidadeCentavos: integer("mensalidade_centavos"),
  diaVencimento: integer("dia_vencimento"), // vazio = dia padrão do professor
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
    referencia: text("referencia"), // mês pago, AAAA-MM (ex.: outubro pago em novembro)
    observacoes: text("observacoes"),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("recibos_professor_numero").on(t.professorId, t.numero)],
);

/**
 * Pagamento marcado à mão no Financeiro (sem recibo). Junto com os recibos, diz se o mês está pago.
 * Ao gerar o recibo de um pagamento marcado, o recibo o substitui (o pagamento é apagado).
 */
export const pagamentos = sqliteTable(
  "pagamentos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    professorId: professorId(),
    // de um aluno OU de uma instituição, como o recibo
    alunoId: integer("aluno_id").references(() => alunos.id, { onDelete: "cascade" }),
    instituicaoId: integer("instituicao_id").references(() => instituicoes.id, { onDelete: "cascade" }),
    referencia: text("referencia").notNull(), // mês pago, AAAA-MM
    valorCentavos: integer("valor_centavos").notNull(),
    dataPagamento: text("data_pagamento").notNull(),
    formaPagamento: text("forma_pagamento"),
    observacao: text("observacao"),
    criadoEm: criadoEm(),
  },
  (t) => [index("pagamentos_professor_referencia").on(t.professorId, t.referencia)],
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

/** Módulos de vídeo (ex.: "Módulo 1 – Iniciante"), na ordem que o professor montar. */
export const modulos = sqliteTable(
  "modulos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    professorId: professorId(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    ordem: integer("ordem").notNull().default(0),
    criadoEm: criadoEm(),
  },
  (t) => [index("modulos_professor").on(t.professorId)],
);

/** Vídeo do Google Drive ou do YouTube, assistido dentro do site. */
export const videos = sqliteTable(
  "videos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    professorId: professorId(),
    moduloId: integer("modulo_id").references(() => modulos.id, { onDelete: "set null" }), // vazio = "Outros vídeos"
    titulo: text("titulo").notNull(),
    descricao: text("descricao"),
    origem: text("origem", { enum: ["drive", "youtube"] }).notNull(),
    link: text("link").notNull(), // como o professor colou
    origemId: text("origem_id").notNull(), // id do arquivo no Drive ou do vídeo no YouTube
    ordem: integer("ordem").notNull().default(0), // dentro do módulo
    paraTodos: integer("para_todos", { mode: "boolean" }).notNull().default(true),
    criadoEm: criadoEm(),
  },
  (t) => [index("videos_professor").on(t.professorId)],
);

export const videosAlunos = sqliteTable(
  "videos_alunos",
  {
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.videoId, t.alunoId] })],
);

/** Quem assistiu (abriu o vídeo no site): primeira e última vez e quantas vezes. */
export const visualizacoes = sqliteTable(
  "visualizacoes",
  {
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
    primeiraVez: text("primeira_vez").notNull(),
    ultimaVez: text("ultima_vez").notNull(),
    vezes: integer("vezes").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.videoId, t.alunoId] })],
);

/** Inscrições para notificações (um aluno pode ter vários aparelhos). */
export const pushInscricoes = sqliteTable("push_inscricoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  alunoId: integer("aluno_id")
    .notNull()
    .references(() => alunos.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  criadoEm: criadoEm(),
});

/** Horários fixos de aula do aluno (pode ter mais de um por semana). */
export const horarios = sqliteTable(
  "horarios",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
    diaSemana: integer("dia_semana").notNull(), // 0 = domingo ... 6 = sábado
    hora: text("hora"), // HH:MM; vazio = horário a definir
    duracaoMin: integer("duracao_min"), // vazio = duração padrão do professor
  },
  (t) => [index("horarios_aluno").on(t.alunoId)],
);

/** Aula fixa que não vai acontecer num dia: desmarcada pelo professor ou o aluno avisou que não vai. */
export const aulasDesmarcadas = sqliteTable(
  "aulas_desmarcadas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    professorId: professorId(),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // AAAA-MM-DD
    hora: text("hora").notNull(), // HH:MM do horário fixo desmarcado
    por: text("por", { enum: ["professor", "aluno"] }).notNull(),
    motivo: text("motivo"),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("desmarcada_aluno_data_hora").on(t.alunoId, t.data, t.hora)],
);

/**
 * Reposição de aula: só existe quando o professor concede (sempre ele decide).
 * Sem data = a marcar; com data e hora = agendada (entra na agenda, na chamada e nos lembretes).
 */
export const reposicoes = sqliteTable(
  "reposicoes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    professorId: professorId(),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
    motivo: text("motivo"), // ex.: "Aula de 13/11 desmarcada pelo professor"
    data: text("data"),
    hora: text("hora"),
    duracaoMin: integer("duracao_min"),
    criadoEm: criadoEm(),
  },
  (t) => [index("reposicoes_professor").on(t.professorId)],
);

/** Lembretes já enviados (aula de tal aluno em tal dia e hora), para não avisar duas vezes. */
export const lembretesEnviados = sqliteTable("lembretes_enviados", {
  chave: text("chave").primaryKey(),
  criadoEm: criadoEm(),
});

/** Diário de aulas: o conteúdo passado para cada aluno (e o que estudar em casa). */
export const diario = sqliteTable(
  "diario",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // AAAA-MM-DD
    conteudo: text("conteudo").notNull(),
    paraCasa: text("para_casa"),
    visivelAluno: integer("visivel_aluno", { mode: "boolean" }).notNull().default(true), // false = anotação só do professor
    criadoEm: criadoEm(),
  },
  (t) => [index("diario_aluno_data").on(t.alunoId, t.data)],
);

/** Aparelhos do professor que recebem notificações (o master recebe o aviso de vencimento dos clientes). */
export const pushProfessores = sqliteTable("push_professores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  professorId: integer("professor_id")
    .notNull()
    .references(() => professores.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  criadoEm: criadoEm(),
});

/** Avisos que o professor manda para os alunos (aparecem no app e chegam como notificação). */
export const avisos = sqliteTable("avisos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  professorId: professorId(),
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem"),
  paraTodos: integer("para_todos", { mode: "boolean" }).notNull().default(true),
  criadoEm: criadoEm(),
});

export const avisosAlunos = sqliteTable(
  "avisos_alunos",
  {
    avisoId: integer("aviso_id")
      .notNull()
      .references(() => avisos.id, { onDelete: "cascade" }),
    alunoId: integer("aluno_id")
      .notNull()
      .references(() => alunos.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.avisoId, t.alunoId] })],
);

export type Professor = typeof professores.$inferSelect;
export type Aluno = typeof alunos.$inferSelect;
export type Presenca = typeof presencas.$inferSelect;
export type Recibo = typeof recibos.$inferSelect;
export type Material = typeof materiais.$inferSelect;
export type Instituicao = typeof instituicoes.$inferSelect;
export type Aviso = typeof avisos.$inferSelect;
export type Pagamento = typeof pagamentos.$inferSelect;
export type Horario = typeof horarios.$inferSelect;
export type AulaDesmarcada = typeof aulasDesmarcadas.$inferSelect;
export type Reposicao = typeof reposicoes.$inferSelect;
export type Modulo = typeof modulos.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type RegistroDiario = typeof diario.$inferSelect;
export type StatusPresenca = Presenca["status"];
export type TipoDrive = Material["tipoDrive"];
