/**
 * Contas de aluno lembradas neste aparelho (localStorage), para entrar de novo com um toque
 * sem precisar lembrar o usuário e o código do professor. Guarda só o que já vai no link pessoal
 * (usuário e código) e os nomes para mostrar; nada de senha (o aluno não tem).
 */

/** `professor`: o que aparece embaixo do nome (estúdio ou professor, ou "Piano com Paula"); `chave`: do link pessoal. */
export type AcessoSalvo = { usuario: string; codigo: string; nome: string; professor: string; chave?: string };

const CHAVE = "acessos-aluno";
const EVENTO = "acessos-aluno-mudou";
const MAXIMO = 5; // ex.: irmãos usando o mesmo celular

const vazio: AcessoSalvo[] = [];
let cache: { texto: string | null; lista: AcessoSalvo[] } = { texto: null, lista: vazio };

/** Lista lembrada (a mesma referência enquanto nada muda, como o useSyncExternalStore pede). */
export function lerAcessos(): AcessoSalvo[] {
  let texto: string | null = null;
  try {
    texto = localStorage.getItem(CHAVE);
  } catch {
    return vazio; // navegador sem armazenamento (aba anônima, bloqueado)
  }
  if (texto === cache.texto) return cache.lista;
  let lista = vazio;
  try {
    const dados = JSON.parse(texto ?? "[]");
    if (Array.isArray(dados)) {
      lista = dados
        .filter((a) => a && typeof a.usuario === "string" && typeof a.codigo === "string")
        .map((a) => ({
          usuario: a.usuario,
          codigo: a.codigo,
          nome: String(a.nome ?? a.usuario),
          professor: String(a.professor ?? ""),
          chave: typeof a.chave === "string" && /^[a-z0-9]{8,32}$/.test(a.chave) ? a.chave : undefined,
        }))
        .slice(0, MAXIMO);
    }
  } catch {
    // conteúdo estragado: começa de novo
  }
  cache = { texto, lista };
  return lista;
}

function gravar(lista: AcessoSalvo[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, MAXIMO)));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    // sem armazenamento: só não lembra
  }
}

const mesmo = (a: Pick<AcessoSalvo, "usuario" | "codigo">, b: Pick<AcessoSalvo, "usuario" | "codigo">) =>
  a.usuario === b.usuario && a.codigo === b.codigo;

/** Lembra (ou atualiza) a conta e a coloca em primeiro. */
export function lembrarAcesso(acesso: AcessoSalvo) {
  const atual = lerAcessos();
  const antes = atual.find((a) => mesmo(a, acesso));
  if (antes && antes === atual[0] && antes.nome === acesso.nome && antes.professor === acesso.professor && antes.chave === acesso.chave) return;
  gravar([acesso, ...atual.filter((a) => !mesmo(a, acesso))]);
}

export function esquecerAcesso(acesso: Pick<AcessoSalvo, "usuario" | "codigo">) {
  gravar(lerAcessos().filter((a) => !mesmo(a, acesso)));
}

export function assinarAcessos(aoMudar: () => void) {
  const aoArmazenar = (e: StorageEvent) => e.key === CHAVE && aoMudar();
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoArmazenar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoArmazenar);
  };
}
