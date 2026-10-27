import { ChevronLeft, ChevronRight, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BotaoLink, Cabecalho, EsqueletoPagina } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { DIAS_SEMANA } from "@/lib/constantes";
import { listarAlunos, presencasNaData } from "@/lib/consultas";
import { dataPorExtenso, hojeISO, isoValido, somarDias } from "@/lib/formato";

import { FormChamada } from "./form-chamada";
import { SeletorData } from "./seletor-data";

export const metadata: Metadata = { title: "Chamada" };

export default function PaginaChamada(props: PageProps<"/chamada">) {
  return (
    <>
      <Cabecalho titulo="Chamada" descricao="Marque presença, falta ou reposição e anote o conteúdo da aula.">
        <BotaoLink href="/chamada/historico" variante="secundario">
          <History /> Histórico
        </BotaoLink>
      </Cabecalho>
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/chamada">["searchParams"] }) {
  await exigirProfessor();
  const params = await searchParams;
  const dia = typeof params.data === "string" && isoValido(params.data) ? params.data : hojeISO();
  const todos = params.todos === "1";
  const diaSemana = DIAS_SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()];

  const [ativos, registros] = await Promise.all([listarAlunos(), presencasNaData(dia)]);
  const porAluno = new Map(registros.map((r) => [r.alunoId, r]));
  // por padrão mostra quem tem aula nesse dia da semana ou já tem marcação na data
  const alunos = (todos ? ativos : ativos.filter((a) => a.diaAula === diaSemana || porAluno.has(a.id))).sort((a, b) =>
    (a.horario ?? "99").localeCompare(b.horario ?? "99"),
  );
  const link = (data: string, mostrarTodos = todos) => `/chamada?data=${data}${mostrarTodos ? "&todos=1" : ""}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BotaoLink href={link(somarDias(dia, -1))} variante="secundario" tamanho="icone" aria-label="Dia anterior">
          <ChevronLeft />
        </BotaoLink>
        <SeletorData valor={dia} todos={todos} />
        <BotaoLink href={link(somarDias(dia, 1))} variante="secundario" tamanho="icone" aria-label="Próximo dia">
          <ChevronRight />
        </BotaoLink>
        <span className="ml-1 text-sm">
          <span className="font-semibold">{diaSemana}</span>
          <span className="text-suave"> · {dataPorExtenso(dia)}</span>
        </span>
        <Link
          href={link(dia, !todos)}
          className="ml-auto rounded-lg px-3 py-1.5 text-sm text-marca-texto hover:bg-marca-suave"
        >
          {todos ? "Só quem tem aula hoje" : "Mostrar todos os alunos"}
        </Link>
      </div>

      <FormChamada
        key={`${dia}-${todos}`}
        data={dia}
        diaSemana={diaSemana}
        alunos={alunos.map((a) => ({
          id: a.id,
          nome: a.nome,
          detalhe: [a.instrumento, a.horario].filter(Boolean).join(" · "),
          status: porAluno.get(a.id)?.status ?? "",
          observacao: porAluno.get(a.id)?.observacao ?? "",
        }))}
        linkTodos={link(dia, true)}
      />
    </>
  );
}
