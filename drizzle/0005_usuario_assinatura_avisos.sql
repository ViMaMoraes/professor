-- Aluno entra só com usuário; descrição do recibo no aluno/instituição; RG e assinatura do professor;
-- notificações (push) e avisos.
CREATE TABLE `avisos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`professor_id` integer NOT NULL,
	`titulo` text NOT NULL,
	`mensagem` text,
	`para_todos` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `avisos_alunos` (
	`aviso_id` integer NOT NULL,
	`aluno_id` integer NOT NULL,
	PRIMARY KEY(`aviso_id`, `aluno_id`),
	FOREIGN KEY (`aviso_id`) REFERENCES `avisos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `push_inscricoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aluno_id` integer NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_inscricoes_endpoint_unique` ON `push_inscricoes` (`endpoint`);--> statement-breakpoint
-- O e-mail do aluno deixa de ser login (pode repetir, ex.: irmãos com o e-mail dos pais)
DROP INDEX IF EXISTS `alunos_email_unique`;--> statement-breakpoint
ALTER TABLE `alunos` ADD `usuario` text;--> statement-breakpoint
ALTER TABLE `alunos` ADD `descricao_recibo` text;--> statement-breakpoint
-- Quem já tinha acesso ao portal continua entrando: o usuário passa a ser o e-mail que já usava
UPDATE `alunos` SET `usuario` = lower(`email`) WHERE `email` IS NOT NULL AND `senha_hash` IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `alunos_usuario_unique` ON `alunos` (`usuario`);--> statement-breakpoint
ALTER TABLE `instituicoes` ADD `tratamento` text;--> statement-breakpoint
ALTER TABLE `instituicoes` ADD `descricao_recibo` text;--> statement-breakpoint
ALTER TABLE `professores` ADD `rg` text;--> statement-breakpoint
ALTER TABLE `professores` ADD `assinatura` text;