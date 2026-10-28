"use client";

import { useRouter } from "next/navigation";

import { Input, Select } from "@/components/ui";

/** Muda a data da chamada mantendo os outros filtros (`extra` = "&todos=1&instituicao=3"...). */
export function SeletorData({ valor, extra }: { valor: string; extra: string }) {
  const router = useRouter();
  return (
    <Input
      type="date"
      defaultValue={valor}
      className="w-auto"
      onChange={(e) => {
        if (e.target.value) router.push(`/chamada?data=${e.target.value}${extra}`);
      }}
    />
  );
}

/** Mostra só os alunos de uma instituição (ou todos). */
export function SeletorInstituicao({
  data,
  valor,
  instituicoes,
}: {
  data: string;
  valor?: number;
  instituicoes: { id: number; nome: string }[];
}) {
  const router = useRouter();
  return (
    <Select
      value={valor ?? ""}
      // nome de instituição comprido não pode alargar a página no celular
      className="w-auto max-w-[calc(100vw-2rem)] sm:max-w-xs"
      aria-label="Filtrar por instituição"
      onChange={(e) => router.push(`/chamada?data=${data}${e.target.value ? `&todos=1&instituicao=${e.target.value}` : ""}`)}
    >
      <option value="">Todos os alunos</option>
      {instituicoes.map((i) => (
        <option key={i.id} value={i.id}>
          {i.nome}
        </option>
      ))}
    </Select>
  );
}
