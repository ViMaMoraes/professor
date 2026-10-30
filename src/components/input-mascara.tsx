"use client";

import { useState, type ComponentProps } from "react";

import { mascaraDocumento, mascaraRg, mascaraTelefone } from "@/lib/mascaras";

import { Input } from "./ui";

const MASCARAS = {
  documento: { aplicar: mascaraDocumento, inputMode: "numeric", placeholder: "000.000.000-00" },
  rg: { aplicar: mascaraRg, inputMode: "text", placeholder: "00.000.000-0" },
  telefone: { aplicar: mascaraTelefone, inputMode: "tel", placeholder: "(11) 99999-9999" },
} as const;

/** Campo que formata enquanto digita (CPF/CNPJ, RG ou telefone). */
export function InputMascara({
  mascara,
  defaultValue,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue"> & {
  mascara: keyof typeof MASCARAS;
  defaultValue?: string | null;
}) {
  const { aplicar, inputMode, placeholder } = MASCARAS[mascara];
  const [valor, setValor] = useState(() => aplicar(defaultValue ?? ""));
  return (
    <Input
      inputMode={inputMode}
      placeholder={placeholder}
      autoComplete="off"
      {...props}
      value={valor}
      onChange={(e) => setValor(aplicar(e.target.value))}
    />
  );
}
