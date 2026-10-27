-- Vários professores na mesma instalação: cada aluno, material e recibo passa a ter um professor dono.
-- (No SQLite/D1, uma coluna nova com REFERENCES não pode ser NOT NULL; o app sempre preenche professor_id.)
ALTER TABLE `professores` ADD `master` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `professores` ADD `ativo` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `professores` ADD `acesso_ate` text;--> statement-breakpoint
ALTER TABLE `professores` ADD `criado_em` text;--> statement-breakpoint
ALTER TABLE `alunos` ADD `professor_id` integer REFERENCES professores(id) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `materiais` ADD `professor_id` integer REFERENCES professores(id) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `recibos` ADD `professor_id` integer REFERENCES professores(id) ON DELETE cascade;--> statement-breakpoint
-- O professor que já usava o sistema (o primeiro cadastrado) vira o master e fica dono dos dados existentes.
UPDATE `professores` SET `master` = 1, `criado_em` = date('now') WHERE `id` = (SELECT min(`id`) FROM `professores`);--> statement-breakpoint
UPDATE `alunos` SET `professor_id` = (SELECT min(`id`) FROM `professores`) WHERE `professor_id` IS NULL;--> statement-breakpoint
UPDATE `materiais` SET `professor_id` = (SELECT min(`id`) FROM `professores`) WHERE `professor_id` IS NULL;--> statement-breakpoint
UPDATE `recibos` SET `professor_id` = (SELECT min(`id`) FROM `professores`) WHERE `professor_id` IS NULL;--> statement-breakpoint
-- Numeração de recibo passa a ser por professor
DROP INDEX IF EXISTS `recibos_numero_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `recibos_professor_numero` ON `recibos` (`professor_id`,`numero`);--> statement-breakpoint
CREATE INDEX `alunos_professor` ON `alunos` (`professor_id`);--> statement-breakpoint
CREATE INDEX `materiais_professor` ON `materiais` (`professor_id`);
