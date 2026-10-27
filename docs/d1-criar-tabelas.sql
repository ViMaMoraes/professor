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
  `master` integer DEFAULT false NOT NULL,
  `ativo` integer DEFAULT true NOT NULL,
  `acesso_ate` text,
  `criado_em` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `professores_email_unique` ON `professores` (`email`);

CREATE TABLE IF NOT EXISTS `alunos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `professor_id` integer REFERENCES professores(id) ON DELETE cascade,
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
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `alunos_email_unique` ON `alunos` (`email`);
CREATE INDEX IF NOT EXISTS `alunos_professor` ON `alunos` (`professor_id`);

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
  `professor_id` integer REFERENCES professores(id) ON DELETE cascade,
  `numero` integer NOT NULL,
  `aluno_id` integer NOT NULL,
  `valor_centavos` integer NOT NULL,
  `referente` text NOT NULL,
  `forma_pagamento` text,
  `data_pagamento` text NOT NULL,
  `observacoes` text,
  `criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
  FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
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
  ('0003_multi_professor.sql');
