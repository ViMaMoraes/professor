import { Settings, UserCog, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { alternarMembro } from "@/app/acoes/equipe";
import { BotaoAcao } from "@/components/botao-acao";
import { BotaoLink, Cabecalho, Card, Selo, Tabela, Vazio } from "@/components/ui";
import { exigirDono } from "@/lib/auth";
import { equipePorAluno, listarMembros } from "@/lib/consultas";
import { CARGOS, LISTA_MODULOS, lerModulos, MODULOS } from "@/lib/permissoes";
import { ehEstudio, planoPermiteEquipe } from "@/lib/planos";

export const metadata: Metadata = { title: "Equipe" };

export default async function PaginaEquipe() {
  const professor = await exigirDono();

  if (!ehEstudio(professor)) {
    return (
      <>
        <Cabecalho titulo="Equipe" />
        <Card>
          <Vazio icone={<UserCog />} titulo="A equipe é para estúdios e escolas">
            {planoPermiteEquipe(professor)
              ? "Em Configurações, mude o tipo de conta para “Estúdio ou escola” para cadastrar outros professores."
              : "A equipe faz parte do plano Estúdio. Fale com o suporte para mudar de plano."}
          </Vazio>
          {planoPermiteEquipe(professor) && (
            <div className="flex justify-center pb-6">
              <BotaoLink href="/configuracoes" variante="secundario">
                <Settings /> Ir para Configurações
              </BotaoLink>
            </div>
          )}
        </Card>
      </>
    );
  }

  const [membros, porAluno] = await Promise.all([listarMembros(professor.id), equipePorAluno(professor.id)]);
  const alunosDe = new Map<number, number>();
  for (const ids of porAluno.values()) for (const m of ids) alunosDe.set(m, (alunosDe.get(m) ?? 0) + 1);

  return (
    <>
      <Cabecalho
        titulo="Equipe"
        descricao="Quem trabalha no estúdio com você e o que cada um pode ver. Cada pessoa entra com o próprio e-mail e senha."
      >
        <BotaoLink href="/equipe/novo">
          <UserPlus /> Adicionar
        </BotaoLink>
      </Cabecalho>
      <Card>
        {membros.length === 0 ? (
          <Vazio icone={<UserCog />} titulo="Ninguém na equipe ainda">
            Adicione os professores do estúdio. Depois, no cadastro de cada aluno, escolha quem dá aula para ele.
          </Vazio>
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Alunos</th>
                <th>Pode ver</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => {
                const modulos = lerModulos(m.modulos);
                return (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/equipe/${m.id}`} className="font-medium hover:text-marca-texto">
                        {m.nome}
                      </Link>
                      <div className="text-xs text-suave">
                        {m.email}
                        {m.trocarSenha && " · senha provisória (ainda não entrou)"}
                      </div>
                    </td>
                    <td>
                      {CARGOS[m.cargo].nome}
                      {m.cursos && <div className="text-xs text-suave">{m.cursos}</div>}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{m.todosAlunos ? "todos" : (alunosDe.get(m.id) ?? 0)}</td>
                    <td className="max-w-72 text-xs text-suave">
                      {modulos.length === LISTA_MODULOS.length ? "tudo" : modulos.map((x) => MODULOS[x]).join(", ") || "só o painel"}
                    </td>
                    <td>{m.ativo ? <Selo cor="verde">liberado</Selo> : <Selo cor="vermelho">bloqueado</Selo>}</td>
                    <td className="text-right whitespace-nowrap">
                      <BotaoAcao
                        acao={alternarMembro.bind(null, m.id)}
                        variante={m.ativo ? "perigo" : "secundario"}
                        tamanho="sm"
                        confirmar={m.ativo ? `Bloquear o acesso de ${m.nome}?` : undefined}
                      >
                        {m.ativo ? "Bloquear" : "Liberar"}
                      </BotaoAcao>{" "}
                      <BotaoLink href={`/equipe/${m.id}`} variante="secundario" tamanho="sm">
                        Editar
                      </BotaoLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        )}
      </Card>
      <p className="mt-3 text-xs text-suave">
        Os recibos saem sempre no nome do estúdio (Configurações). Bloquear não apaga nada: liberando de novo, tudo volta como estava.
      </p>
    </>
  );
}
