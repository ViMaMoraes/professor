-- Notificações para a equipe do estúdio: cada aparelho do professor diz se é do dono (membro_id vazio, recebe
-- também o financeiro) ou de alguém da equipe (resumo das aulas dele e aviso de falta dos alunos dele).
ALTER TABLE `push_professores` ADD `membro_id` integer REFERENCES membros(id) ON DELETE cascade;
