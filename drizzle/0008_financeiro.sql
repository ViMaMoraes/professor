-- Financeiro: dia de vencimento (padrão do professor e por aluno/instituição), mês de referência
-- no recibo e pagamentos marcados à mão (sem recibo).
CREATE TABLE `pagamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`professor_id` integer NOT NULL,
	`aluno_id` integer,
	`instituicao_id` integer,
	`referencia` text NOT NULL,
	`valor_centavos` integer NOT NULL,
	`data_pagamento` text NOT NULL,
	`forma_pagamento` text,
	`observacao` text,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instituicao_id`) REFERENCES `instituicoes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pagamentos_professor_referencia` ON `pagamentos` (`professor_id`,`referencia`);--> statement-breakpoint
ALTER TABLE `alunos` ADD `dia_vencimento` integer;--> statement-breakpoint
ALTER TABLE `instituicoes` ADD `dia_vencimento` integer;--> statement-breakpoint
ALTER TABLE `professores` ADD `dia_vencimento` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `recibos` ADD `referencia` text;--> statement-breakpoint
-- recibos já emitidos contam para o mês em que foram pagos
UPDATE `recibos` SET `referencia` = substr(`data_pagamento`, 1, 7) WHERE `referencia` IS NULL;
