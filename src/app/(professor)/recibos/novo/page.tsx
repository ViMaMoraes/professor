import type { Metadata } from "next";
import { Suspense } from "react";

import { BotaoLink, Cabecalho, Card, EsqueletoPagina, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarAlunos, listarInstituicoes } from "@/lib/consultas";
import { hojeISO, MESES } from "@/lib/formato";

import { FormRecibo } from "./form-recibo";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Novo recibo" };

export default function PaginaNovoRecibo(props: PageProps<"/recibos/novo">) {
  return (
    <>
      <Cabecalho titulo="Novo recibo" descricao="O número é gerado automaticamente." />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/recibos/novo">["searchParams"] }) {
  const professor = await exigirProfessor();
  const params = await searchParams;
  const alunoId = Number(params.aluno) || undefined;
  const instituicaoId = Number(params.instituicao) || undefined;
  const [alunos, instituicoes] = await Promise.all([listarAlunos(professor.id), listarInstituicoes(professor.id)]);
  if (alunos.length === 0 && instituicoes.length === 0) {
    return (
      <Card>
        <Vazio icone={<Users />} titulo="Cadastre um aluno antes de gerar recibos">
          <BotaoLink href="/alunos/novo" className="mt-3">
            Cadastrar aluno
          </BotaoLink>
        </Vazio>
      </Card>
    );
  }
  const hoje = hojeISO();
  const mes = MESES[Number(hoje.slice(5, 7)) - 1];
  return (
    <FormRecibo
      alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, mensalidade: a.mensalidadeCentavos }))}
      instituicoes={instituicoes.map(({ instituicao: i }) => ({
        id: i.id,
        nome: i.nome,
        mensalidade: i.valorMensalCentavos,
        alunos: alunos.filter((a) => a.instituicaoId === i.id).map((a) => a.nome),
      }))}
      alunoInicial={alunos.some((a) => a.id === alunoId) ? alunoId : undefined}
      instituicaoInicial={instituicoes.some(({ instituicao: i }) => i.id === instituicaoId) ? instituicaoId : undefined}
      hoje={hoje}
      referentePadrao={`aulas de música - mensalidade de ${mes}/${hoje.slice(0, 4)}`}
    />
  );
}
