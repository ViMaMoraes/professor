/**
 * Resumo da presença do aluno a partir das chamadas (sem banco, para poder testar).
 * Mesma regra da página do aluno no professor: presença e reposição contam como presente;
 * falta e falta justificada, como ausência.
 */

import type { StatusPresenca } from "./db/schema";

export type RegistroPresenca = { data: string; status: StatusPresenca };

export function resumoPresenca(registros: RegistroPresenca[]) {
  const conta = { presente: 0, reposicao: 0, justificada: 0, falta: 0 };
  for (const r of registros) conta[r.status]++;
  const total = registros.length;
  const presentes = conta.presente + conta.reposicao;
  return { ...conta, total, presentes, frequencia: total ? Math.round((100 * presentes) / total) : null };
}

/** Registros agrupados por mês (AAAA-MM), do mais recente para o mais antigo, com o resumo de cada mês. */
export function presencaPorMes(registros: RegistroPresenca[]) {
  const meses = new Map<string, RegistroPresenca[]>();
  for (const r of [...registros].sort((a, b) => b.data.localeCompare(a.data))) {
    const mes = r.data.slice(0, 7);
    meses.set(mes, [...(meses.get(mes) ?? []), r]);
  }
  return [...meses].map(([mes, doMes]) => ({ mes, registros: doMes, resumo: resumoPresenca(doMes) }));
}
