-- Diário de aulas (conteúdo passado a cada aluno) e mensagem do professor no acesso do aluno.
CREATE TABLE `diario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aluno_id` integer NOT NULL,
	`data` text NOT NULL,
	`conteudo` text NOT NULL,
	`para_casa` text,
	`visivel_aluno` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diario_aluno_data` ON `diario` (`aluno_id`,`data`);--> statement-breakpoint
ALTER TABLE `alunos` ADD `mensagem` text;