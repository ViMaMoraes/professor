import { Building2, KeyRound, Search, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BotaoLink, Botao, Cabecalho, Card, EsqueletoPagina, Input, Select, Selo, Tabela, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarAlunos, listarInstituicoes } from "@/lib/consultas";
import { moeda } from "@/lib/formato";

export const metadata: Metadata = { title: "Alunos" };

export default function PaginaAlunos(props: PageProps<"/alunos">) {
  return (
    <>
      <Cabecalho titulo="Alunos" descricao="Cadastro, contato e situação de cada aluno.">
        <BotaoLink href="/alunos/novo">
          <UserPlus /> Novo aluno
        </BotaoLink>
      </Cabecalho>
      <Suspense fallback={<EsqueletoPagina />}>
        <Lista searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Lista({ searchParams }: { searchParams: PageProps<"/alunos">["searchParams"] }) {
  const professor = await exigirProfessor();
  const params = await searchParams;
  const busca = typeof params.q === "string" ? params.q.trim() : "";
  const situacao = typeof params.situacao === "string" ? params.situacao : "ativos";
  const instituicaoId = Number(params.instituicao) || undefined;
  const [alunos, instituicoes] = await Promise.all([
    listarAlunos(professor.id, { busca, situacao, instituicaoId }),
    listarInstituicoes(professor.id, { situacao: "todas" }),
  ]);
  const nomeInstituicao = new Map(instituicoes.map(({ instituicao: i }) => [i.id, i.nome]));

  return (
    <>
      <form className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave" />
          <Input name="q" defaultValue={busca} placeholder="Buscar por nome, instrumento ou e-mail" className="pl-9" />
        </div>
        {instituicoes.length > 0 && (
          <Select name="instituicao" defaultValue={instituicaoId ?? ""} className="sm:w-52">
            <option value="">Todas as instituições</option>
            {instituicoes.map(({ instituicao: i }) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </Select>
        )}
        <Select name="situacao" defaultValue={situacao} className="sm:w-40">
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </Select>
        <Botao variante="secundario">Filtrar</Botao>
      </form>

      <Card>
        {alunos.length === 0 ? (
          <Vazio icone={<Users />} titulo="Nenhum aluno encontrado">
            {busca ? "Tente outra busca." : "Cadastre o primeiro aluno para começar."}
          </Vazio>
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Instrumento</th>
                <th>Aula</th>
                <th>Mensalidade</th>
                <th>Portal</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/alunos/${a.id}`} className="font-medium hover:text-marca-texto">
                      {a.nome}
                    </Link>
                    {!a.ativo && <Selo className="ml-2">inativo</Selo>}
                    <div className="text-xs text-suave">
                      {a.instituicaoId ? (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3" /> {nomeInstituicao.get(a.instituicaoId)}
                        </span>
                      ) : (
                        a.telefone
                      )}
                    </div>
                  </td>
                  <td>
                    {a.instrumento ?? "—"}
                    {a.nivel && <span className="text-xs text-suave"> · {a.nivel}</span>}
                  </td>
                  <td className="whitespace-nowrap">{a.diaAula ? `${a.diaAula} ${a.horario ?? ""}` : "—"}</td>
                  <td className="whitespace-nowrap">{moeda(a.mensalidadeCentavos)}</td>
                  <td>
                    {a.email && a.senhaHash ? (
                      <Selo cor="verde">
                        <KeyRound className="size-3" /> liberado
                      </Selo>
                    ) : (
                      <Selo>sem acesso</Selo>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Card>
    </>
  );
}
