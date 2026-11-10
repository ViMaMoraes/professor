/**
 * O que cada pessoa da equipe de um estúdio pode ver (sem banco, para poder testar).
 * O dono da conta vê tudo. Quem é da equipe vê só os módulos liberados e, se não tiver
 * "todos os alunos", só os alunos de que é professor. Configurações, Equipe e Administração
 * são sempre só do dono.
 */

export const MODULOS = {
  alunos: "Alunos",
  instituicoes: "Instituições",
  agenda: "Agenda",
  chamada: "Chamada e diário",
  financeiro: "Financeiro e valores",
  recibos: "Recibos",
  materiais: "Downloads",
  videos: "Vídeos",
  avisos: "Avisos",
} as const;

export type Modulo = keyof typeof MODULOS;
export const LISTA_MODULOS = Object.keys(MODULOS) as Modulo[];

export type Cargo = "professor" | "coordenacao";

/** Modelos prontos: o dono escolhe um e ajusta as caixinhas se quiser. */
export const CARGOS: Record<Cargo, { nome: string; descricao: string; modulos: Modulo[]; todosAlunos: boolean }> = {
  professor: {
    nome: "Professor",
    descricao: "Os próprios alunos: agenda, chamada, diário, downloads, vídeos e avisos. Não vê valores.",
    modulos: ["alunos", "agenda", "chamada", "materiais", "videos", "avisos"],
    todosAlunos: false,
  },
  coordenacao: {
    nome: "Coordenação",
    descricao: "Todos os alunos e todos os módulos, menos Configurações e Equipe.",
    modulos: [...LISTA_MODULOS],
    todosAlunos: true,
  },
};

export const cargoValido = (valor: unknown): valor is Cargo => valor === "professor" || valor === "coordenacao";
export const moduloValido = (valor: unknown): valor is Modulo => typeof valor === "string" && Object.hasOwn(MODULOS, valor);

/** "alunos,agenda" → ["alunos", "agenda"] (ignora o que não for módulo). */
export function lerModulos(texto: string | null | undefined): Modulo[] {
  return [
    ...new Set(
      (texto ?? "")
        .split(",")
        .map((m) => m.trim())
        .filter(moduloValido),
    ),
  ];
}

export const gravarModulos = (modulos: Modulo[]) => LISTA_MODULOS.filter((m) => modulos.includes(m)).join(",");

/** Quem está usando a conta: o dono, ou alguém da equipe com os módulos e o alcance dele. */
export type Acesso =
  | { dono: true; membroId: null; nome: string }
  | { dono: false; membroId: number; nome: string; modulos: Modulo[]; todosAlunos: boolean };

export function acessoDoMembro(membro: { id: number; nome: string; modulos: string; todosAlunos: boolean }): Acesso {
  return { dono: false, membroId: membro.id, nome: membro.nome, modulos: lerModulos(membro.modulos), todosAlunos: membro.todosAlunos };
}

export const ACESSO_DONO = (nome: string): Acesso => ({ dono: true, membroId: null, nome });

export function podeVer(acesso: Acesso, modulo: Modulo) {
  return acesso.dono || acesso.modulos.includes(modulo);
}

/** Vê só os próprios alunos? (o id dele, para filtrar) ou null = vê todos. */
export function filtroDeAlunos(acesso: Acesso) {
  return acesso.dono || acesso.todosAlunos ? null : acesso.membroId;
}

/** Módulo de cada endereço do menu (o painel é de todos; Configurações e Equipe, só do dono). */
export function moduloDoCaminho(caminho: string): Modulo | "dono" | null {
  const raiz = caminho.split("/")[1] ?? "";
  if (raiz === "configuracoes" || raiz === "equipe" || raiz === "admin") return "dono";
  if (raiz === "folha-recibo") return "recibos";
  return moduloValido(raiz) ? raiz : null;
}

/**
 * Para quem um material, vídeo ou aviso fica liberado quando quem salva é da equipe e só vê os próprios alunos:
 * - "todos" vira "todos os MEUS alunos" (não libera para os alunos de outros professores);
 * - o que já era para todos continua para todos (ele não pode tirar o acesso dos outros alunos);
 * - alunos de outros professores que já tinham acesso continuam tendo.
 * Quem vê todos os alunos (dono, coordenação) escolhe livremente.
 */
export function destinoLiberado({
  restrito,
  querTodos,
  escolhidos,
  meus,
  eraParaTodos = false,
  vinculosAtuais = [],
}: {
  restrito: boolean;
  querTodos: boolean;
  escolhidos: number[];
  meus: number[];
  eraParaTodos?: boolean;
  vinculosAtuais?: number[];
}): { paraTodos: boolean; alunoIds: number[] } {
  if (!restrito) return { paraTodos: querTodos, alunoIds: querTodos ? [] : escolhidos };
  if (eraParaTodos) return { paraTodos: true, alunoIds: [] };
  const deOutros = vinculosAtuais.filter((a) => !meus.includes(a));
  const meusEscolhidos = querTodos ? meus : escolhidos.filter((a) => meus.includes(a));
  return { paraTodos: false, alunoIds: [...new Set([...meusEscolhidos, ...deOutros])] };
}
