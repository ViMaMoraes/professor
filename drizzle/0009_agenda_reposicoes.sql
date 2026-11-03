-- Agenda: horários de aula (vários por aluno), aulas desmarcadas, reposições (só quando o professor concede),
-- lembretes enviados, duração padrão da aula e antecedência do lembrete.
CREATE TABLE `aulas_desmarcadas` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `desmarcada_aluno_data_hora` ON `aulas_desmarcadas` (`aluno_id`,`data`,`hora`);--> statement-breakpoint
CREATE TABLE `horarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aluno_id` integer NOT NULL,
	`dia_semana` integer NOT NULL,
	`hora` text,
	`duracao_min` integer,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `horarios_aluno` ON `horarios` (`aluno_id`);--> statement-breakpoint
CREATE TABLE `lembretes_enviados` (
	`chave` text PRIMARY KEY NOT NULL,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reposicoes` (
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
--> statement-breakpoint
CREATE INDEX `reposicoes_professor` ON `reposicoes` (`professor_id`);--> statement-breakpoint
ALTER TABLE `professores` ADD `duracao_aula` integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `professores` ADD `lembrete_minutos` integer DEFAULT 120 NOT NULL;--> statement-breakpoint
-- o dia e horário que já estavam no cadastro do aluno viram o primeiro horário dele
INSERT INTO `horarios` (`aluno_id`, `dia_semana`, `hora`)
SELECT `id`,
  CASE `dia_aula` WHEN 'Domingo' THEN 0 WHEN 'Segunda' THEN 1 WHEN 'Terça' THEN 2 WHEN 'Quarta' THEN 3 WHEN 'Quinta' THEN 4 WHEN 'Sexta' THEN 5 WHEN 'Sábado' THEN 6 END,
  NULLIF(`horario`, '')
FROM `alunos` WHERE `dia_aula` IN ('Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado');
