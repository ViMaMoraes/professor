-- Instituições (escola, igreja, projeto, família...) que pagam por vários alunos.
-- O recibo passa a ser de um aluno OU de uma instituição; a chamada continua por aluno.
CREATE TABLE `instituicoes` (
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
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `instituicoes_professor` ON `instituicoes` (`professor_id`);--> statement-breakpoint
ALTER TABLE `alunos` ADD `instituicao_id` integer REFERENCES instituicoes(id) ON DELETE set null;--> statement-breakpoint
-- Recria a tabela de recibos para aluno_id deixar de ser obrigatório (o SQLite não altera NOT NULL).
-- Nenhuma outra tabela aponta para recibos, então apagar a antiga não afeta mais nada.
CREATE TABLE `__new_recibos` (
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
	FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instituicao_id`) REFERENCES `instituicoes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_recibos` (`id`, `professor_id`, `numero`, `aluno_id`, `valor_centavos`, `referente`, `forma_pagamento`, `data_pagamento`, `observacoes`, `criado_em`)
SELECT `id`, coalesce(`professor_id`, (SELECT min(`id`) FROM `professores`)), `numero`, `aluno_id`, `valor_centavos`, `referente`, `forma_pagamento`, `data_pagamento`, `observacoes`, `criado_em` FROM `recibos`;--> statement-breakpoint
DROP TABLE `recibos`;--> statement-breakpoint
ALTER TABLE `__new_recibos` RENAME TO `recibos`;--> statement-breakpoint
CREATE UNIQUE INDEX `recibos_professor_numero` ON `recibos` (`professor_id`,`numero`);
