CREATE TABLE `alunos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
--> statement-breakpoint
CREATE UNIQUE INDEX `alunos_email_unique` ON `alunos` (`email`);--> statement-breakpoint
CREATE TABLE `materiais` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`categoria` text,
	`arquivo` text NOT NULL,
	`nome_original` text NOT NULL,
	`tipo` text,
	`tamanho` integer NOT NULL,
	`para_todos` integer DEFAULT false NOT NULL,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `materiais_alunos` (
	`material_id` integer NOT NULL,
	`aluno_id` integer NOT NULL,
	PRIMARY KEY(`material_id`, `aluno_id`),
	FOREIGN KEY (`material_id`) REFERENCES `materiais`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `presencas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aluno_id` integer NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL,
	`observacao` text,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `presenca_aluno_data` ON `presencas` (`aluno_id`,`data`);--> statement-breakpoint
CREATE TABLE `professores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`senha_hash` text NOT NULL,
	`documento` text,
	`telefone` text,
	`endereco` text,
	`cidade` text,
	`chave_pix` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `professores_email_unique` ON `professores` (`email`);--> statement-breakpoint
CREATE TABLE `recibos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
--> statement-breakpoint
CREATE UNIQUE INDEX `recibos_numero_unique` ON `recibos` (`numero`);