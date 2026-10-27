import { STATUS_PRESENCA } from "@/lib/constantes";
import type { StatusPresenca } from "@/lib/db/schema";

import { Selo } from "./ui";

const COR = { presente: "verde", falta: "vermelho", justificada: "amarelo", reposicao: "azul" } as const;

export function SeloPresenca({ status }: { status: StatusPresenca }) {
  return <Selo cor={COR[status]}>{STATUS_PRESENCA[status].nome}</Selo>;
}
