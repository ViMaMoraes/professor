-- Usuário do aluno passa a ser único por professor (antes era único no site inteiro), e cada professor
-- ganha um código curto que identifica de quem é o aluno no login. Os alunos que já tinham usuário ficam
-- marcados como "usuario_global": continuam entrando só com o usuário, como antes (links antigos valem).
-- O código dos professores existentes é gerado pelo site no próximo acesso de cada um.
DROP INDEX `alunos_usuario_unique`;--> statement-breakpoint
ALTER TABLE `alunos` ADD `usuario_global` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `alunos` SET `usuario_global` = 1 WHERE `usuario` IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `alunos_professor_usuario` ON `alunos` (`professor_id`,`usuario`);--> statement-breakpoint
ALTER TABLE `professores` ADD `codigo` text;--> statement-breakpoint
CREATE UNIQUE INDEX `professores_codigo_unique` ON `professores` (`codigo`);
