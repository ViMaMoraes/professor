-- Planos simplificados para Plus (até 5 alunos ativos) e Premium (ilimitado); o tempo de acesso é a data "acesso_ate".
-- Converte quem já estava nos nomes antigos (iniciante → plus; completo/anual → premium).
UPDATE `professores` SET `plano` = 'plus' WHERE `plano` = 'iniciante';--> statement-breakpoint
UPDATE `professores` SET `plano` = 'premium' WHERE `plano` <> 'plus';
