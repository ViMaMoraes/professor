import { ChevronLeft, ChevronRight, FileSpreadsheet, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BotaoLink, Cabecalho, EsqueletoPagina, estiloBotao } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { DIAS_SEMANA } from "@/lib/constantes";
import { agendaDoPeriodo, listarAlunos, listarInstituicoes, presencasNaData } from "@/lib/consultas";
import { dataPorExtenso, hojeISO, isoValido, somarDias } from "@/lib/formato";

import { FormChamada } from "./form-chamada";
import { SeletorData, SeletorInstituicao } from "./seletor-data";

export const metadata: Metadata = { title: "Chamada" };

export default function PaginaChamada(props: PageProps<"/chamada">) {
  return (
    <>
      <Cabecalho titulo="Chamada" descricao="Marque presença, falta ou reposição e anote o conteúdo da aula.">
        <BotaoLink href="/chamada/historico" variante="secundario">
          <History /> Histórico
        </BotaoLink>
        <a href="/api/chamada/planilha" download className={estiloBotao({ variante: "sucesso" })} title="Chamada do mês atual em Excel">
          <FileSpreadsheet /> Exportar mês
        </a>
      </Cabecalho>
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/chamada">["searchParams"] }) {
  const professor = await exigirProfessor("chamada");
  const params = await searchParams;
  const dia = typeof params.data === "string" && isoValido(params.data) ? params.data : hojeISO();
  const instituicaoId = Number(params.instituicao) || undefined;
  // ao filtrar por instituição, mostra todos os alunos dela (não só os do dia da semana)
  const todos = params.todos === "1" || Boolean(instituicaoId);
  const diaSemana = DIAS_SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()];

  const [ativos, registros, instituicoes, agenda] = await Promise.all([
    listarAlunos(professor, { instituicaoId }),
    presencasNaData(professor, dia),
    listarInstituicoes(professor.id),
    agendaDoPeriodo(professor, dia, dia),
  ]);
  const porAluno = new Map(registros.map((r) => [r.alunoId, r]));
  // aula do dia de cada aluno (fixa ou reposição); aula desmarcada pelo professor não entra
  const aulaDo = new Map(agenda.filter((o) => o.desmarcada?.por !== "professor").map((o) => [o.alunoId, o]));
  // por padrão mostra quem tem aula nesse dia (agenda) ou já tem marcação na data
  const alunos = (todos ? ativos : ativos.filter((a) => aulaDo.has(a.id) || porAluno.has(a.id))).sort((a, b) =>
    (aulaDo.get(a.id)?.hora ?? "99").localeCompare(aulaDo.get(b.id)?.hora ?? "99") || a.nome.localeCompare(b.nome),
  );
  const extra = (mostrarTodos: boolean) => `${mostrarTodos ? "&todos=1" : ""}${instituicaoId ? `&instituicao=${instituicaoId}` : ""}`;
  const link = (data: string, mostrarTodos = todos) => `/chamada?data=${data}${extra(mostrarTodos)}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BotaoLink href={link(somarDias(dia, -1))} variante="secundario" tamanho="icone" aria-label="Dia anterior">
          <ChevronLeft />
        </BotaoLink>
        <SeletorData valor={dia} extra={extra(todos)} />
        <BotaoLink href={link(somarDias(dia, 1))} variante="secundario" tamanho="icone" aria-label="Próximo dia">
          <ChevronRight />
        </BotaoLink>
        <span className="ml-1 text-sm">
          <span className="font-semibold">{diaSemana}</span>
          <span className="text-suave"> · {dataPorExtenso(dia)}</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {instituicoes.length > 0 && (
            <SeletorInstituicao data={dia} valor={instituicaoId} instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))} />
          )}
          {!instituicaoId && (
            <Link href={link(dia, !todos)} className="rounded-lg px-3 py-1.5 text-sm text-marca-texto hover:bg-marca-suave">
              {todos ? "Só quem tem aula hoje" : "Mostrar todos os alunos"}
            </Link>
          )}
        </div>
      </div>

      <FormChamada
        key={`${dia}-${todos}-${instituicaoId ?? ""}`}
        data={dia}
        diaSemana={diaSemana}
        alunos={alunos.map((a) => ({
          id: a.id,
          nome: a.nome,
          detalhe: [
            a.instrumento,
            aulaDo.get(a.id)?.hora,
            aulaDo.get(a.id)?.tipo === "reposicao" && "reposição",
            aulaDo.get(a.id)?.desmarcada?.por === "aluno" && "avisou que não vem",
          ]
            .filter(Boolean)
            .join(" · "),
          status: porAluno.get(a.id)?.status ?? "",
          observacao: porAluno.get(a.id)?.observacao ?? "",
        }))}
        linkTodos={link(dia, true)}
      />
    </>
  );
}
