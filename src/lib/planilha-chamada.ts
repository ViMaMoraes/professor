import type { Cell, Sheet } from "write-excel-file/universal";

import { DIAS_SEMANA, STATUS_PRESENCA } from "./constantes";
import type { StatusPresenca } from "./db/schema";
import { dataBR } from "./formato";

export type RegistroChamada = {
  data: string; // AAAA-MM-DD
  status: StatusPresenca;
  observacao: string | null;
  aluno: { id: number; nome: string; instrumento: string | null };
};

const STATUS: StatusPresenca[] = ["presente", "falta", "justificada", "reposicao"];

const COR: Record<StatusPresenca, { fundo: string; texto: string }> = {
  presente: { fundo: "#D1FAE5", texto: "#065F46" },
  falta: { fundo: "#FEE2E2", texto: "#991B1B" },
  justificada: { fundo: "#FEF3C7", texto: "#92400E" },
  reposicao: { fundo: "#E0F2FE", texto: "#075985" },
};

const ROXO = "#5B33B3";
const borda = { borderColor: "#D4D4D8", borderStyle: "thin" } as const;
const cabecalho = (valor: string, extra: Partial<Cell & object> = {}): Cell => ({
  value: valor,
  fontWeight: "bold",
  textColor: "#FFFFFF",
  backgroundColor: ROXO,
  align: "center",
  alignVertical: "center",
  ...borda,
  ...extra,
});
const titulo = (valor: string, colunas: number): Cell => ({ value: valor, fontWeight: "bold", fontSize: 14, columnSpan: colunas });

/** Data "AAAA-MM-DD" como Date (meio-dia UTC, para não mudar de dia por fuso). */
const comoData = (iso: string) => new Date(`${iso}T12:00:00Z`);
const diaDaSemana = (iso: string) => DIAS_SEMANA[comoData(iso).getUTCDay()];

export function contarPorAluno(registros: RegistroChamada[]) {
  const porAluno = new Map<number, { aluno: RegistroChamada["aluno"]; total: Record<StatusPresenca, number> }>();
  for (const r of registros) {
    const item = porAluno.get(r.aluno.id) ?? { aluno: r.aluno, total: { presente: 0, falta: 0, justificada: 0, reposicao: 0 } };
    item.total[r.status]++;
    porAluno.set(r.aluno.id, item);
  }
  return [...porAluno.values()]
    .map(({ aluno, total }) => {
      const aulas = STATUS.reduce((soma, s) => soma + total[s], 0);
      // presença e reposição contam como aula assistida
      const frequencia = aulas ? (total.presente + total.reposicao) / aulas : 0;
      return { aluno, total, aulas, frequencia };
    })
    .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR"));
}

/** Monta as três abas da planilha de chamada do período. */
export function abasPlanilhaChamada(registros: RegistroChamada[], periodo: { inicio: string; fim: string }): Sheet<Blob>[] {
  const textoPeriodo = `${dataBR(periodo.inicio)} a ${dataBR(periodo.fim)}`;
  const resumo = contarPorAluno(registros);
  const datas = [...new Set(registros.map((r) => r.data))].sort();
  const marcacao = new Map(registros.map((r) => [`${r.aluno.id}|${r.data}`, r.status]));

  // Aba 1: grade (alunos × datas), como um diário de classe
  const totaisCab = STATUS.map((s) => cabecalho(STATUS_PRESENCA[s].sigla));
  const grade: Cell[][] = [
    [titulo(`Chamada · ${textoPeriodo}`, 2 + datas.length + 5)],
    [],
    [
      cabecalho("Aluno", { align: "left" }),
      cabecalho("Instrumento", { align: "left" }),
      ...datas.map((d) => cabecalho(`${dataBR(d).slice(0, 5)}\n${diaDaSemana(d).slice(0, 3)}`, { wrap: true })),
      ...totaisCab,
      cabecalho("Frequência"),
    ],
    ...resumo.map(({ aluno, total, frequencia }): Cell[] => [
      { value: aluno.nome, ...borda },
      { value: aluno.instrumento ?? "", ...borda },
      ...datas.map((d): Cell => {
        const status = marcacao.get(`${aluno.id}|${d}`);
        if (!status) return { value: "", ...borda };
        return {
          value: STATUS_PRESENCA[status].sigla,
          align: "center",
          fontWeight: "bold",
          backgroundColor: COR[status].fundo,
          textColor: COR[status].texto,
          ...borda,
        };
      }),
      ...STATUS.map((s): Cell => ({ value: total[s], align: "center", ...borda })),
      { value: frequencia, format: "0%", align: "center", fontWeight: "bold", ...borda },
    ]),
    [],
    [{ value: "P = presente · F = falta · J = falta justificada · R = reposição", fontStyle: "italic", textColor: "#71717A", columnSpan: 8 }],
  ];

  // Aba 2: resumo por aluno
  const resumoAba: Cell[][] = [
    [titulo(`Resumo por aluno · ${textoPeriodo}`, 8)],
    [],
    [
      cabecalho("Aluno", { align: "left" }),
      cabecalho("Instrumento", { align: "left" }),
      cabecalho("Presenças"),
      cabecalho("Faltas"),
      cabecalho("Justificadas"),
      cabecalho("Reposições"),
      cabecalho("Total de aulas"),
      cabecalho("Frequência"),
    ],
    ...resumo.map(({ aluno, total, aulas, frequencia }): Cell[] => [
      { value: aluno.nome, ...borda },
      { value: aluno.instrumento ?? "", ...borda },
      ...STATUS.map((s): Cell => ({ value: total[s], align: "center", ...borda })),
      { value: aulas, align: "center", ...borda },
      { value: frequencia, format: "0%", align: "center", fontWeight: "bold", ...borda },
    ]),
  ];

  // Aba 3: todos os registros, com as observações
  const ordenados = [...registros].sort((a, b) => a.data.localeCompare(b.data) || a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR"));
  const registrosAba: Cell[][] = [
    [titulo(`Registros · ${textoPeriodo}`, 5)],
    [],
    [
      cabecalho("Data"),
      cabecalho("Dia"),
      cabecalho("Aluno", { align: "left" }),
      cabecalho("Situação", { align: "left" }),
      cabecalho("Observação", { align: "left" }),
    ],
    ...ordenados.map((r): Cell[] => [
      { value: comoData(r.data), format: "dd/mm/yyyy", align: "center", ...borda },
      { value: diaDaSemana(r.data), ...borda },
      { value: r.aluno.nome, ...borda },
      { value: STATUS_PRESENCA[r.status].nome, backgroundColor: COR[r.status].fundo, textColor: COR[r.status].texto, ...borda },
      { value: r.observacao ?? "", wrap: true, ...borda },
    ]),
  ];

  return [
    {
      sheet: "Chamada",
      data: grade,
      columns: [{ width: 28 }, { width: 16 }, ...datas.map(() => ({ width: 7 })), ...STATUS.map(() => ({ width: 5 })), { width: 11 }],
      stickyRowsCount: 3,
      stickyColumnsCount: 1,
      orientation: "landscape",
    },
    {
      sheet: "Resumo",
      data: resumoAba,
      columns: [{ width: 28 }, { width: 16 }, { width: 11 }, { width: 9 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 11 }],
      stickyRowsCount: 3,
      orientation: "landscape",
    },
    {
      sheet: "Registros",
      data: registrosAba,
      columns: [{ width: 12 }, { width: 10 }, { width: 28 }, { width: 18 }, { width: 50 }],
      stickyRowsCount: 3,
    },
  ];
}

export async function gerarPlanilhaChamada(registros: RegistroChamada[], periodo: { inicio: string; fim: string }) {
  const { default: escreverPlanilha } = await import("write-excel-file/universal");
  const blob = await escreverPlanilha(abasPlanilhaChamada(registros, periodo), { fontFamily: "Calibri", fontSize: 11 }).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}
