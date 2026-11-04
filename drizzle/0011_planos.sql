-- Plano de cada professor cliente (define o limite de alunos ativos). Quem já existe fica no Premium (ilimitado).
ALTER TABLE `professores` ADD `plano` text DEFAULT 'premium' NOT NULL;
