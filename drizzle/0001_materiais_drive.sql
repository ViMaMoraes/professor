-- Os materiais passam a ser links do Google Drive. Materiais antigos (arquivos enviados ao site)
-- não têm link equivalente, então são removidos junto com suas liberações.
DELETE FROM `materiais_alunos`;--> statement-breakpoint
DELETE FROM `materiais`;--> statement-breakpoint
ALTER TABLE `materiais` ADD `link` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `materiais` ADD `tipo_drive` text DEFAULT 'arquivo' NOT NULL;--> statement-breakpoint
ALTER TABLE `materiais` ADD `drive_id` text DEFAULT '' NOT NULL;
