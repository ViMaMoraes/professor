-- Cursos do aluno (estúdio): cada aluno pode ter mais de um curso, cada um com o seu professor (dono ou alguém
-- da equipe), horários, chamada e presença. A presença ganha o curso (0 = sem curso separado), então o aluno pode
-- ter duas aulas no mesmo dia. A equipe guarda do que dá aula. Cada aluno ganha a chave do link pessoal.
CREATE TABLE `cursos_aluno` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aluno_id` integer NOT NULL,
	`nome` text NOT NULL,
	`membro_id` integer,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membro_id`) REFERENCES `membros`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `cursos_aluno_aluno` ON `cursos_aluno` (`aluno_id`);--> statement-breakpoint
CREATE INDEX `cursos_aluno_membro` ON `cursos_aluno` (`membro_id`);--> statement-breakpoint
DROP INDEX `presenca_aluno_data`;--> statement-breakpoint
ALTER TABLE `presencas` ADD `curso_id` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `presenca_aluno_data_curso` ON `presencas` (`aluno_id`,`data`,`curso_id`);--> statement-breakpoint
ALTER TABLE `alunos` ADD `chave` text;--> statement-breakpoint
UPDATE `alunos` SET `chave` = lower(hex(randomblob(6)));--> statement-breakpoint
CREATE UNIQUE INDEX `alunos_chave` ON `alunos` (`chave`);--> statement-breakpoint
ALTER TABLE `horarios` ADD `curso_id` integer REFERENCES cursos_aluno(id) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `membros` ADD `cursos` text;--> statement-breakpoint
ALTER TABLE `reposicoes` ADD `curso_id` integer REFERENCES cursos_aluno(id) ON DELETE set null;
