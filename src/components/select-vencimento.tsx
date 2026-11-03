import { Select } from "./ui";

/** Dia de vencimento da mensalidade (1 a 28). Com `padrao`, a primeira opção é "usar o dia padrão". */
export function SelectVencimento({ name, valor, padrao }: { name: string; valor: number | null | undefined; padrao?: number }) {
  return (
    <Select name={name} defaultValue={valor ?? (padrao ? "" : 10)}>
      {padrao && <option value="">Padrão (dia {padrao})</option>}
      {Array.from({ length: 28 }, (_, i) => i + 1).map((dia) => (
        <option key={dia} value={dia}>
          Dia {dia}
        </option>
      ))}
    </Select>
  );
}
