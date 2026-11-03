/**
 * Regras do Financeiro (sem banco, para poder testar): quem é cobrado no mês, quando vence,
 * quanto já foi pago (recibos + pagamentos marcados à mão) e a situação de cada um.
 */

export type TipoPagador = "aluno" | "instituicao";

/** Aluno particular ou instituição, como está no cadastro. */
export type Pagador = {
  tipo: TipoPagador;
  id: number;
  nome: string;
  /** Mensalidade (aluno) ou valor mensal (instituição); vazio/zero = não é cobrado. */
  valorCentavos: number | null;
  diaVencimento: number | null;
  telefone: string | null;
  /** Com quem falar na cobrança: responsável do aluno ou contato da instituição. */
  contato?: string | null;
  ativo: boolean;
  /** Aluno de instituição é cobrado pela instituição, não separado. */
  pagoPorInstituicao?: boolean;
  /** AAAA-MM-DD: a partir de quando é cobrado (início das aulas ou data do cadastro). */
  desde: string | null;
};

export type Lancamento = {
  origem: "recibo" | "manual";
  /** id do recibo ou do pagamento marcado */
  id: number;
  tipo: TipoPagador;
  pagadorId: number;
  valorCentavos: number;
  dataPagamento: string;
  formaPagamento: string | null;
  /** número do recibo (só origem "recibo") */
  numero?: number;
};

export type Situacao = "pago" | "parcial" | "a-vencer" | "atrasado";

export type LinhaFinanceiro = {
  pagador: Pagador;
  esperadoCentavos: number;
  pagoCentavos: number;
  faltaCentavos: number;
  vencimento: string;
  situacao: Situacao;
  /** dias de atraso (só "atrasado") */
  diasAtraso: number;
  lancamentos: Lancamento[];
};

export const DIA_VENCIMENTO_PADRAO = 10;

const ultimoDia = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};

/** Data de vencimento no mês; dia 29/30/31 em mês mais curto vira o último dia. */
export function vencimentoNoMes(mes: string, dia: number) {
  const d = Math.min(Math.max(1, Math.trunc(dia) || DIA_VENCIMENTO_PADRAO), ultimoDia(mes));
  return `${mes}-${String(d).padStart(2, "0")}`;
}

export function mesValido(mes: unknown): mes is string {
  return typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function somarMeses(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);

/** Quem deve pagar neste mês: ativo, com valor, não pago pela instituição e já começado. */
export function cobradoNoMes(p: Pagador, mes: string) {
  if (!p.ativo || !p.valorCentavos || p.valorCentavos <= 0 || p.pagoPorInstituicao) return false;
  return !p.desde || p.desde.slice(0, 7) <= mes;
}

export type MotivoFora = "sem-valor" | "ainda-nao-comecou";

/**
 * Ativos que NÃO entram na cobrança do mês e por quê (para não sumirem sem explicação).
 * Aluno de instituição fica de fora de propósito (é cobrado pela instituição) e não entra aqui.
 */
export function foraDaCobranca(pagadores: Pagador[], mes: string, jaListados: Set<string>) {
  const fora: { pagador: Pagador; motivo: MotivoFora }[] = [];
  for (const p of pagadores) {
    if (!p.ativo || p.pagoPorInstituicao || jaListados.has(`${p.tipo}-${p.id}`)) continue;
    if (!p.valorCentavos || p.valorCentavos <= 0) fora.push({ pagador: p, motivo: "sem-valor" });
    else if (p.desde && p.desde.slice(0, 7) > mes) fora.push({ pagador: p, motivo: "ainda-nao-comecou" });
  }
  // instituições primeiro, depois alunos, em ordem alfabética
  const peso = (t: TipoPagador) => (t === "instituicao" ? 0 : 1);
  return fora.sort((a, b) => peso(a.pagador.tipo) - peso(b.pagador.tipo) || a.pagador.nome.localeCompare(b.pagador.nome));
}

const ORDEM: Record<Situacao, number> = { atrasado: 0, parcial: 1, "a-vencer": 2, pago: 3 };

/**
 * Situação de cada pagador no mês. Entra quem é cobrado no mês e também quem pagou algo nele
 * (ex.: aluno que saiu mas quitou o mês), para o histórico bater com os recebimentos.
 */
export function montarFinanceiro(pagadores: Pagador[], lancamentos: Lancamento[], mes: string, hoje: string, diaPadrao: number) {
  const chave = (tipo: TipoPagador, id: number) => `${tipo}-${id}`;
  const porPagador = new Map<string, Lancamento[]>();
  for (const l of lancamentos) {
    const k = chave(l.tipo, l.pagadorId);
    porPagador.set(k, [...(porPagador.get(k) ?? []), l]);
  }

  const linhas: LinhaFinanceiro[] = [];
  for (const p of pagadores) {
    const doMes = (porPagador.get(chave(p.tipo, p.id)) ?? []).sort((a, b) => a.dataPagamento.localeCompare(b.dataPagamento));
    const cobrado = cobradoNoMes(p, mes);
    if (!cobrado && doMes.length === 0) continue;

    const pago = doMes.reduce((total, l) => total + l.valorCentavos, 0);
    const esperado = cobrado ? p.valorCentavos! : pago;
    const falta = Math.max(0, esperado - pago);
    const vencimento = vencimentoNoMes(mes, p.diaVencimento ?? diaPadrao);
    const atrasado = falta > 0 && hoje > vencimento;
    const situacao: Situacao = falta === 0 ? "pago" : atrasado ? "atrasado" : pago > 0 ? "parcial" : "a-vencer";
    linhas.push({
      pagador: p,
      esperadoCentavos: esperado,
      pagoCentavos: pago,
      faltaCentavos: falta,
      vencimento,
      situacao,
      diasAtraso: atrasado ? diasEntre(vencimento, hoje) : 0,
      lancamentos: doMes,
    });
  }

  linhas.sort(
    (a, b) => ORDEM[a.situacao] - ORDEM[b.situacao] || a.vencimento.localeCompare(b.vencimento) || a.pagador.nome.localeCompare(b.pagador.nome),
  );
  return linhas;
}

export function resumoFinanceiro(linhas: LinhaFinanceiro[]) {
  let previsto = 0;
  let recebido = 0;
  let aVencer = 0;
  let atrasado = 0;
  for (const l of linhas) {
    previsto += l.esperadoCentavos;
    recebido += l.pagoCentavos;
    if (l.situacao === "atrasado") atrasado += l.faltaCentavos;
    else aVencer += l.faltaCentavos;
  }
  return { previsto, recebido, aVencer, atrasado };
}

const MESES_NOMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** "2026-11" → "Novembro de 2026" */
export function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES_NOMES[m - 1]} de ${a}`;
}

/** Dia de vencimento enviado num formulário (1 a 28); vazio ou inválido = null (usa o padrão). */
export function lerDiaVencimento(valor: FormDataEntryValue | null) {
  const dia = Number(valor);
  return Number.isInteger(dia) && dia >= 1 && dia <= 28 ? dia : null;
}
