-- Plano de cada professor cliente (define o limite de alunos ativos). Quem já existe fica no Completo (ilimitado).
ALTER TABLE `professores` ADD `plano` text DEFAULT 'completo' NOT NULL;
