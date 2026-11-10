import { ChevronLeft, ChevronRight, FileSpreadsheet, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BotaoLink, Cabecalho, EsqueletoPagina, estiloBotao } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { DIAS_SEMANA } from "@/lib/constantes";
import { rotuloCurso } from "@/lib/agenda";
import { agendaDoPeriodo, cursosDaConta, listarAlunos, listarInstituicoes, presencasNaData } from "@/lib/consultas";
import { ehEstudio } from "@/lib/planos";
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

  const [ativos, registros, instituicoes, agenda, cursos] = await Promise.all([
    listarAlunos(professor, { instituicaoId }),
    presencasNaData(professor, dia),
    listarInstituicoes(professor.id),
    agendaDoPeriodo(professor, dia, dia),
    cursosDaConta(professor),
  ]);
  const estudio = ehEstudio(professor);
  const nomeAluno = new Map(ativos.map((a) => [a.id, a]));
  const cursoPorId = new Map(cursos.map((c) => [c.id, c]));
  // equipe que só vê os próprios alunos: só as aulas dos cursos dela (ou sem curso, de aluno dela)
  const restrito = professor.escopoMembro != null;
  const podeVerCurso = (cursoId: number) => cursoId === 0 || !restrito || cursoPorId.has(cursoId);
  const chave = (alunoId: number, cursoId: number) => `${alunoId}-${cursoId}`;
  const registroDe = new Map(registros.filter((r) => podeVerCurso(r.cursoId)).map((r) => [chave(r.alunoId, r.cursoId), r]));
  // aulas do dia (fixas ou reposições); aula desmarcada pelo professor não entra
  const aulaDe = new Map(agenda.filter((o) => o.desmarcada?.por !== "professor").map((o) => [chave(o.alunoId, o.cursoId), o]));

  // uma linha por aula (aluno + curso): quem tem aula no dia e o que já foi marcado; em "todos", cada curso de cada aluno
  const linhas = new Map<string, { alunoId: number; cursoId: number }>();
  const incluir = (alunoId: number, cursoId: number) => nomeAluno.has(alunoId) && linhas.set(chave(alunoId, cursoId), { alunoId, cursoId });
  if (todos) {
    for (const a of ativos) {
      const doAluno = cursos.filter((c) => c.alunoId === a.id);
      if (doAluno.length) doAluno.forEach((c) => incluir(a.id, c.id));
      else if (!restrito || !estudio) incluir(a.id, 0);
    }
  }
  for (const o of aulaDe.values()) incluir(o.alunoId, o.cursoId);
  for (const r of registroDe.values()) incluir(r.alunoId, r.cursoId);

  const rotulo = (cursoId: number, alunoId: number) => {
    const c = cursoPorId.get(cursoId);
    if (!c) return nomeAluno.get(alunoId)?.instrumento;
    // o professor só aparece quando não é quem está fazendo a chamada
    return restrito ? c.nome : rotuloCurso(c.nome, c.membro ?? professor.nome);
  };
  const alunos = [...linhas.entries()]
    .map(([k, { alunoId, cursoId }]) => ({ k, alunoId, cursoId, aula: aulaDe.get(k) }))
    .sort(
      (x, y) =>
        (x.aula?.hora ?? "99").localeCompare(y.aula?.hora ?? "99") ||
        nomeAluno.get(x.alunoId)!.nome.localeCompare(nomeAluno.get(y.alunoId)!.nome),
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
            <SeletorInstituicao
              data={dia}
              valor={instituicaoId}
              instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))}
            />
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
        alunos={alunos.map(({ k, alunoId, cursoId, aula }) => ({
          chave: k,
          nome: nomeAluno.get(alunoId)!.nome,
          detalhe: [
            rotulo(cursoId, alunoId),
            aula?.hora,
            aula?.tipo === "reposicao" && "reposição",
            aula?.desmarcada?.por === "aluno" && "avisou que não vem",
          ]
            .filter(Boolean)
            .join(" · "),
          status: registroDe.get(k)?.status ?? "",
          observacao: registroDe.get(k)?.observacao ?? "",
        }))}
        linkTodos={link(dia, true)}
      />
    </>
  );
}
