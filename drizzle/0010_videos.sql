-- Vídeos (Drive ou YouTube) assistidos dentro do site, em módulos montados pelo professor;
-- quem pode ver cada vídeo e quem assistiu.
CREATE TABLE `modulos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`professor_id` integer NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`ordem` integer DEFAULT 0 NOT NULL,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `modulos_professor` ON `modulos` (`professor_id`);--> statement-breakpoint
CREATE TABLE `videos` (
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
--> statement-breakpoint
CREATE INDEX `videos_professor` ON `videos` (`professor_id`);--> statement-breakpoint
CREATE TABLE `videos_alunos` (
	`video_id` integer NOT NULL,
	`aluno_id` integer NOT NULL,
	PRIMARY KEY(`video_id`, `aluno_id`),
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `visualizacoes` (
	`video_id` integer NOT NULL,
	`aluno_id` integer NOT NULL,
	`primeira_vez` text NOT NULL,
	`ultima_vez` text NOT NULL,
	`vezes` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`video_id`, `aluno_id`),
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade
);
