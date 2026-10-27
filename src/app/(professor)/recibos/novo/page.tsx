import type { Metadata } from "next";
import { Suspense } from "react";

import { BotaoLink, Cabecalho, Card, EsqueletoPagina, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarAlunos } from "@/lib/consultas";
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
  const alunoId = Number((await searchParams).aluno) || undefined;
  const alunos = await listarAlunos(professor.id);
  if (alunos.length === 0) {
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
      alunoInicial={alunos.some((a) => a.id === alunoId) ? alunoId : undefined}
      hoje={hoje}
      referentePadrao={`aulas de música - mensalidade de ${mes}/${hoje.slice(0, 4)}`}
    />
  );
}
