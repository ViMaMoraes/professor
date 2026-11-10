-- Conta de estúdio com equipe: o dono informa se é professor sozinho ou estúdio (o recibo do estúdio sai no
-- nome dele), cadastra professores e coordenação (membros, com login próprio e módulos liberados) e diz
-- quais professores dão aula para cada aluno (aluno_equipe). Contas existentes continuam "autonomo".
CREATE TABLE `aluno_equipe` (
	`aluno_id` integer NOT NULL,
	`membro_id` integer NOT NULL,
	PRIMARY KEY(`aluno_id`, `membro_id`),
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membro_id`) REFERENCES `membros`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `aluno_equipe_membro` ON `aluno_equipe` (`membro_id`);--> statement-breakpoint
CREATE TABLE `membros` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `membros_email_unique` ON `membros` (`email`);--> statement-breakpoint
CREATE INDEX `membros_professor` ON `membros` (`professor_id`);--> statement-breakpoint
ALTER TABLE `professores` ADD `tipo_conta` text DEFAULT 'autonomo' NOT NULL;--> statement-breakpoint
ALTER TABLE `professores` ADD `nome_estudio` text;