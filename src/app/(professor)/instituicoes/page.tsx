import { Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Botao, BotaoLink, Cabecalho, Card, Select, Selo, Tabela, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarInstituicoes } from "@/lib/consultas";
import { moeda } from "@/lib/formato";

export const metadata: Metadata = { title: "Instituições" };

export default async function PaginaInstituicoes(props: PageProps<"/instituicoes">) {
  const professor = await exigirProfessor();
  const params = await props.searchParams;
  const situacao = typeof params.situacao === "string" ? params.situacao : "ativas";
  const linhas = await listarInstituicoes(professor.id, { situacao });

  return (
    <>
      <Cabecalho
        titulo="Instituições"
        descricao="Escolas, igrejas, projetos ou famílias que pagam por vários alunos. O recibo sai no nome delas; a chamada continua por aluno."
      >
        <BotaoLink href="/instituicoes/novo">
          <Plus /> Nova instituição
        </BotaoLink>
      </Cabecalho>
      <form className="mb-4 flex gap-2">
        <Select name="situacao" defaultValue={situacao} className="sm:w-40">
          <option value="ativas">Ativas</option>
          <option value="inativas">Inativas</option>
          <option value="todas">Todas</option>
        </Select>
        <Botao variante="secundario">Filtrar</Botao>
      </form>
      <Card>
        {linhas.length === 0 ? (
          <Vazio icone={<Building2 />} titulo="Nenhuma instituição">
            Cadastre quando der aula para uma escola, igreja ou projeto que paga por vários alunos.
          </Vazio>
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th>Instituição</th>
                <th>Contato</th>
                <th>Alunos ativos</th>
                <th>Valor mensal</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ instituicao: i, alunosAtivos }) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/instituicoes/${i.id}`} className="font-medium hover:text-marca-texto">
                      {i.nome}
                    </Link>
                    {!i.ativo && <Selo className="ml-2">inativa</Selo>}
                    {i.documento && <div className="text-xs text-suave">{i.documento}</div>}
                  </td>
                  <td>
                    {i.contato ?? "—"}
                    <div className="text-xs text-suave">{i.telefone}</div>
                  </td>
                  <td className="tabular-nums">{alunosAtivos}</td>
                  <td className="whitespace-nowrap">{moeda(i.valorMensalCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Card>
    </>
  );
}
