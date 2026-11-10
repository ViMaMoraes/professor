"use client";

import { useEffect } from "react";

import { lembrarAcesso, type AcessoSalvo } from "@/lib/acessos-salvos";

/** Guarda neste aparelho a conta do aluno que está dentro, para a próxima entrada ser com um toque. */
export function LembrarAcesso(acesso: AcessoSalvo) {
  const { usuario, codigo, nome, professor, chave } = acesso;
  useEffect(() => {
    lembrarAcesso({ usuario, codigo, nome, professor, chave });
  }, [usuario, codigo, nome, professor, chave]);
  return null;
}
