import { useSyncExternalStore } from "react";

const nada = () => () => {};

/** Endereço base dos links para enviar: o oficial (ENDERECO_SITE) ou, sem ele, o aberto no navegador. */
export function useEnderecoSite(oficial: string | null | undefined) {
  const atual = useSyncExternalStore(nada, () => window.location.origin, () => "");
  return oficial || atual;
}
