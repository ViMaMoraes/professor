-- Senha provisória (troca obrigatória no primeiro login), aviso de vencimento ao master e
-- aparelhos do professor inscritos nas notificações.
CREATE TABLE `push_professores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`professor_id` integer NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`criado_em` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_professores_endpoint_unique` ON `push_professores` (`endpoint`);--> statement-breakpoint
ALTER TABLE `professores` ADD `trocar_senha` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `professores` ADD `vencimento_avisado` text;