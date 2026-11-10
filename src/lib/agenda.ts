/**
 * Regras da agenda (sem banco, para poder testar): as aulas de um período a partir dos horários fixos,
 * menos as desmarcadas, mais as reposições agendadas. Datas em AAAA-MM-DD, horas em HH:MM (Brasília).
 */

export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DURACOES = [30, 40, 45, 50, 60, 90, 120];
/** Antecedência do lembrete da aula para o aluno (minutos; 0 = não avisar). */
export const LEMBRETES: [number, string][] = [
  [0, "Não avisar"],
  [30, "30 minutos antes"],
  [60, "1 hora antes"],
  [120, "2 horas antes"],
  [180, "3 horas antes"],
  [360, "6 horas antes"],
  [1440, "1 dia antes"],
];

export type HorarioAluno = {
  alunoId: number;
  nome: string;
  diaSemana: number;
  hora: string | null;
  duracaoMin: number | null;
  /** AAAA-MM-DD: antes disso o aluno ainda não tinha aula */
  inicio?: string | null;
  /** curso do horário (estúdio) e o professor dele (membro da equipe; vazio = o dono) */
  cursoId?: number | null;
  curso?: string | null;
  membroId?: number | null;
  /** nome do professor da equipe (vazio = o dono) */
  professor?: string | null;
};
export type Desmarcada = { id: number; alunoId: number; data: string; hora: string; por: "professor" | "aluno"; motivo: string | null };
export type ReposicaoAgendada = {
  id: number;
  alunoId: number;
  nome: string;
  data: string;
  hora: string | null;
  duracaoMin: number | null;
  motivo: string | null;
  cursoId?: number | null;
  curso?: string | null;
  membroId?: number | null;
  /** nome do professor da equipe (vazio = o dono) */
  professor?: string | null;
};

export type Ocorrencia = {
  /** identifica a aula (para lembretes e chaves de lista) */
  chave: string;
  data: string;
  hora: string | null;
  duracaoMin: number;
  alunoId: number;
  nome: string;
  tipo: "aula" | "reposicao";
  /** curso da aula (estúdio); 0 = sem curso separado (é a chave da presença) */
  cursoId: number;
  curso: string | null;
  /** professor da equipe que dá a aula; null = o dono da conta */
  membroId: number | null;
  /** nome do professor da equipe; null = o dono da conta */
  professor: string | null;
  desmarcada?: Desmarcada;
  reposicao?: ReposicaoAgendada;
};

export const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();

export function somarDiasAgenda(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira da semana da data. */
export function inicioDaSemana(data: string) {
  return somarDiasAgenda(data, -((diaDaSemana(data) + 6) % 7));
}

/** Data e hora agora em Brasília (UTC-3, sem horário de verão desde 2019). O Worker roda em UTC. */
export function agoraBrasilia(agora = new Date()) {
  const local = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const iso = local.toISOString();
  return { data: iso.slice(0, 10), hora: iso.slice(11, 16), minutos: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

export const minutosDe = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

export function horaValida(hora: unknown): hora is string {
  return typeof hora === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

/** Aulas (fixas e reposições) entre `de` e `ate`, inclusive, em ordem de data e hora. */
export function montarAgenda({
  horarios,
  desmarcadas,
  reposicoes,
  de,
  ate,
  duracaoPadrao,
}: {
  horarios: HorarioAluno[];
  desmarcadas: Desmarcada[];
  reposicoes: ReposicaoAgendada[];
  de: string;
  ate: string;
  duracaoPadrao: number;
}) {
  const desmarcadaDe = new Map(desmarcadas.map((d) => [`${d.alunoId}|${d.data}|${d.hora}`, d]));
  const lista: Ocorrencia[] = [];
  for (let data = de; data <= ate; data = somarDiasAgenda(data, 1)) {
    const dia = diaDaSemana(data);
    for (const h of horarios) {
      if (h.diaSemana !== dia || (h.inicio && h.inicio > data)) continue;
      const hora = h.hora ?? "";
      lista.push({
        chave: `aula:${h.alunoId}:${data}:${hora}`,
        data,
        hora: h.hora,
        duracaoMin: h.duracaoMin ?? duracaoPadrao,
        alunoId: h.alunoId,
        nome: h.nome,
        tipo: "aula",
        cursoId: h.cursoId ?? 0,
        curso: h.curso ?? null,
        membroId: h.membroId ?? null,
        professor: h.professor ?? null,
        desmarcada: desmarcadaDe.get(`${h.alunoId}|${data}|${hora}`),
      });
    }
  }
  for (const r of reposicoes) {
    if (r.data < de || r.data > ate) continue;
    lista.push({
      chave: `reposicao:${r.id}`,
      data: r.data,
      hora: r.hora,
      duracaoMin: r.duracaoMin ?? duracaoPadrao,
      alunoId: r.alunoId,
      nome: r.nome,
      tipo: "reposicao",
      cursoId: r.cursoId ?? 0,
      curso: r.curso ?? null,
      membroId: r.membroId ?? null,
      professor: r.professor ?? null,
      reposicao: r,
    });
  }
  // horário a definir vai para o fim do dia
  return lista.sort(
    (a, b) => a.data.localeCompare(b.data) || (a.hora ?? "99").localeCompare(b.hora ?? "99") || a.nome.localeCompare(b.nome) || a.cursoId - b.cursoId,
  );
}

/** "Seg 18:00, Qua 18:00" (ou "Sáb (horário a definir)") */
export function resumoHorarios(lista: Pick<HorarioAluno, "diaSemana" | "hora">[]) {
  return [...lista]
    .sort((a, b) => ((a.diaSemana + 6) % 7) - ((b.diaSemana + 6) % 7) || (a.hora ?? "").localeCompare(b.hora ?? ""))
    .map((h) => `${DIAS_CURTOS[h.diaSemana]} ${h.hora ?? "(horário a definir)"}`)
    .join(", ");
}

/**
 * Aulas cujo lembrete deve sair agora: o horário do lembrete (início - antecedência) já passou,
 * mas há no máximo `tolerancia` minutos (o agendamento roda a cada 15 minutos).
 */
export function aulasParaLembrar(ocorrencias: Ocorrencia[], agora: { data: string; minutos: number }, antecedencia: number, tolerancia = 30) {
  const agoraAbs = Date.parse(`${agora.data}T00:00:00Z`) / 60000 + agora.minutos;
  return ocorrencias.filter((o) => {
    if (!o.hora || o.desmarcada) return false;
    const inicio = Date.parse(`${o.data}T00:00:00Z`) / 60000 + minutosDe(o.hora);
    const lembrete = inicio - antecedencia;
    return lembrete <= agoraAbs && agoraAbs - lembrete < tolerancia && inicio > agoraAbs;
  });
}

/** "Piano com Paula" / "Piano" / null, para mostrar de quem é a aula. */
export function rotuloCurso(curso: string | null | undefined, professor: string | null | undefined) {
  if (!curso && !professor) return null;
  if (!professor) return curso ?? null;
  const primeiro = professor.trim().split(/\s+/)[0];
  return curso ? `${curso} com ${primeiro}` : `com ${primeiro}`;
}
