-- Cria todas as tabelas do site no Cloudflare D1, de uma vez (para um banco NOVO, vazio).
-- Se o banco já existe e só falta atualizar, use: npx wrangler d1 migrations apply professor-db --remote
-- Rode no console do D1 (Storage & Databases → D1 → professor-db → Console)
-- ou pelo terminal: npx wrangler d1 execute professor-db --remote --file docs/d1-criar-tabelas.sql
-- É seguro rodar mais de uma vez (IF NOT EXISTS / INSERT OR IGNORE).

CREATE TABLE IF NOT EXISTS `professores` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nome` text NOT NULL,
  `email` text NOT NULL,
  `senha_hash` text NOT NULL,
  `documento` text,
  `telefone` text,
  `endereco` text,
  `cidade` text,
  `chave_pix` text,
  `rg` text,
  `assinatura` text,
  `trocar_senha` integer DEFAULT false NOT NULL,
  `dia_vencimento` integer DEFAULT 10 NOT NULL,
  `duracao_aula` integer DEFAULT 60 NOT NULL,
  `lembrete_minutos` integer DEFAULT 120 NOT NULL,
  `vencimento_avisado` text,
  `master` integer DEFAULT false NOT NULL,
  `ativo` integer DEFAULT true NOT NULL,
  `acesso_ate` text,
  `tipo_conta` text DEFAULT 'autonomo' NOT NULL,
  `nome_estudio` text,
  `plano` text DEFAULT 'premium' NOT NULL,
  `codigo` text,
  `criado_em` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `professores_email_unique` ON `professores` (`email`);
CREATE UNIQUE INDEX IF NOT EXISTS `professores_codigo_unique` ON `professores` (`codigo`);

CREATE TABLE IF NOT EXISTS `membros` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `nome` text NOT NULL,
  `email` text NOT NULL,
  `senha_hash` text NOT NULL,
  `trocar_senha` integer DEFAULT true NOT NULL,
  `cargo` text DEFAULT 'professor' NOT NULL,
  `modulos` text DEFAULT '' NOT NULL,
  `todos_alunos` integer DEFAULT false NOT NULL,
  `ativo` integer DEFAULT true NOT NULL,
  `criado_em` text,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `membros_email_unique` ON `membros` (`email`);
CREATE INDEX IF NOT EXISTS `membros_professor` ON `membros` (`professor_id`);

CREATE TABLE IF NOT EXISTS `instituicoes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `nome` text NOT NULL,
  `documento` text,
  `contato` text,
  `email` text,
  `telefone` text,
  `endereco` text,
  `valor_mensal_centavos` integer,
  `observacoes` text,
  `tratamento` text,
  `descricao_recibo` text,
  `dia_vencimento` integer,
  `ativo` integer DEFAULT true NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `instituicoes_professor` ON `instituicoes` (`professor_id`);

CREATE TABLE IF NOT EXISTS `alunos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer REFERENCES professores(id) ON DELETE cascade,
  `instituicao_id` integer REFERENCES instituicoes(id) ON DELETE set null,
  `nome` text NOT NULL,
  `email` text,
  `senha_hash` text,
  `telefone` text,
  `responsavel` text,
  `data_nascimento` text,
  `instrumento` text,
  `nivel` text,
  `dia_aula` text,
  `horario` text,
  `mensalidade_centavos` integer,
  `data_inicio` text,
  `ativo` integer DEFAULT true NOT NULL,
  `observacoes` text,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  `usuario` text,
  `usuario_global` integer DEFAULT false NOT NULL,
  `descricao_recibo` text,
  `mensagem` text,
  `dia_vencimento` integer
);
CREATE UNIQUE INDEX IF NOT EXISTS `alunos_professor_usuario` ON `alunos` (`professor_id`,`usuario`);
CREATE INDEX IF NOT EXISTS `alunos_professor` ON `alunos` (`professor_id`);

CREATE TABLE IF NOT EXISTS `aluno_equipe` (
  `aluno_id` integer NOT NULL,
  `membro_id` integer NOT NULL,
  PRIMARY KEY(`aluno_id`, `membro_id`),
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`membro_id`) REFERENCES `membros`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `aluno_equipe_membro` ON `aluno_equipe` (`membro_id`);

CREATE TABLE IF NOT EXISTS `presencas` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `aluno_id` integer NOT NULL,
  `data` text NOT NULL,
  `status` text NOT NULL,
  `observacao` text,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `presenca_aluno_data` ON `presencas` (`aluno_id`, `data`);

CREATE TABLE IF NOT EXISTS `recibos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `numero` integer NOT NULL,
  `aluno_id` integer,
  `instituicao_id` integer,
  `valor_centavos` integer NOT NULL,
  `referente` text NOT NULL,
  `forma_pagamento` text,
  `data_pagamento` text NOT NULL,
  `observacoes` text,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  `referencia` text,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`instituicao_id`) REFERENCES `instituicoes`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `recibos_professor_numero` ON `recibos` (`professor_id`, `numero`);

CREATE TABLE IF NOT EXISTS `materiais` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer REFERENCES professores(id) ON DELETE cascade,
  `titulo` text NOT NULL,
  `descricao` text,
  `categoria` text,
  `link` text NOT NULL,
  `tipo_drive` text NOT NULL,
  `drive_id` text NOT NULL,
  `para_todos` integer DEFAULT false NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);
CREATE INDEX IF NOT EXISTS `materiais_professor` ON `materiais` (`professor_id`);

CREATE TABLE IF NOT EXISTS `materiais_alunos` (
  `material_id` integer NOT NULL,
  `aluno_id` integer NOT NULL,
  PRIMARY KEY (`material_id`, `aluno_id`),
  FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `push_inscricoes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `aluno_id` integer NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth` text NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `push_inscricoes_endpoint_unique` ON `push_inscricoes` (`endpoint`);

CREATE TABLE IF NOT EXISTS `modulos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `nome` text NOT NULL,
  `descricao` text,
  `ordem` integer DEFAULT 0 NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `modulos_professor` ON `modulos` (`professor_id`);

CREATE TABLE IF NOT EXISTS `videos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `modulo_id` integer,
  `titulo` text NOT NULL,
  `descricao` text,
  `origem` text NOT NULL,
  `link` text NOT NULL,
  `origem_id` text NOT NULL,
  `ordem` integer DEFAULT 0 NOT NULL,
  `para_todos` integer DEFAULT true NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`modulo_id`) REFERENCES `modulos`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS `videos_professor` ON `videos` (`professor_id`);

CREATE TABLE IF NOT EXISTS `videos_alunos` (
  `video_id` integer NOT NULL,
  `aluno_id` integer NOT NULL,
  PRIMARY KEY (`video_id`, `aluno_id`),
  FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `visualizacoes` (
  `video_id` integer NOT NULL,
  `aluno_id` integer NOT NULL,
  `primeira_vez` text NOT NULL,
  `ultima_vez` text NOT NULL,
  `vezes` integer DEFAULT 1 NOT NULL,
  PRIMARY KEY (`video_id`, `aluno_id`),
  FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `horarios` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `aluno_id` integer NOT NULL,
  `dia_semana` integer NOT NULL,
  `hora` text,
  `duracao_min` integer,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `horarios_aluno` ON `horarios` (`aluno_id`);

CREATE TABLE IF NOT EXISTS `aulas_desmarcadas` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `aluno_id` integer NOT NULL,
  `data` text NOT NULL,
  `hora` text NOT NULL,
  `por` text NOT NULL,
  `motivo` text,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `desmarcada_aluno_data_hora` ON `aulas_desmarcadas` (`aluno_id`, `data`, `hora`);

CREATE TABLE IF NOT EXISTS `reposicoes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `aluno_id` integer NOT NULL,
  `motivo` text,
  `data` text,
  `hora` text,
  `duracao_min` integer,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `reposicoes_professor` ON `reposicoes` (`professor_id`);

CREATE TABLE IF NOT EXISTS `lembretes_enviados` (
  `chave` text PRIMARY KEY NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);

CREATE TABLE IF NOT EXISTS `pagamentos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `aluno_id` integer,
  `instituicao_id` integer,
  `referencia` text NOT NULL,
  `valor_centavos` integer NOT NULL,
  `data_pagamento` text NOT NULL,
  `forma_pagamento` text,
  `observacao` text,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`instituicao_id`) REFERENCES `instituicoes`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `pagamentos_professor_referencia` ON `pagamentos` (`professor_id`, `referencia`);

CREATE TABLE IF NOT EXISTS `diario` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `aluno_id` integer NOT NULL,
  `data` text NOT NULL,
  `conteudo` text NOT NULL,
  `para_casa` text,
  `visivel_aluno` integer DEFAULT true NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `diario_aluno_data` ON `diario` (`aluno_id`, `data`);

CREATE TABLE IF NOT EXISTS `push_professores` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth` text NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `push_professores_endpoint_unique` ON `push_professores` (`endpoint`);

CREATE TABLE IF NOT EXISTS `avisos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer NOT NULL,
  `titulo` text NOT NULL,
  `mensagem` text,
  `para_todos` integer DEFAULT true NOT NULL,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `avisos_alunos` (
  `aviso_id` integer NOT NULL,
  `aluno_id` integer NOT NULL,
  PRIMARY KEY (`aviso_id`, `aluno_id`),
  FOREIGN KEY (`aviso_id`) REFERENCES `avisos`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Marca as migrações como já aplicadas, para o
-- `wrangler d1 migrations apply` não tentar criar as tabelas de novo.
CREATE TABLE IF NOT EXISTS `d1_migrations` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT UNIQUE,
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT OR IGNORE INTO `d1_migrations` (`name`) VALUES
  ('0000_inicial.sql'),
  ('0001_materiais_drive.sql'),
  ('0002_remove_upload.sql'),
  ('0003_multi_professor.sql'),
  ('0004_instituicoes.sql'),
  ('0005_usuario_assinatura_avisos.sql'),
  ('0006_senha_provisoria_aviso_vencimento.sql'),
  ('0007_diario_mensagem_aluno.sql'),
  ('0008_financeiro.sql'),
  ('0009_agenda_reposicoes.sql'),
  ('0010_videos.sql'),
  ('0011_planos.sql'),
  ('0012_planos_plus_premium.sql'),
  ('0013_usuario_por_professor.sql'),
  ('0014_equipe_estudio.sql');
