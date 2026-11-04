import { Users } from "lucide-react";

import { contarAlunosAtivos } from "@/lib/consultas";
import { limiteDeAlunos, PLANOS, planoValido, textoLimiteAtingido } from "@/lib/planos";

/**
 * Quanto do plano o professor já usa ("3 de 5 alunos ativos"). Só aparece em plano com limite;
 * ao chegar no limite, explica o que fazer.
 */
export async function UsoDoPlano({ professor }: { professor: { id: number; plano: string; master: boolean } }) {
  const limite = limiteDeAlunos(professor);
  if (limite == null) return null;
  const ativos = await contarAlunosAtivos(professor.id);
  const cheio = ativos >= limite;
  const nome = PLANOS[planoValido(professor.plano) ? professor.plano : "completo"].nome;
  return (
    <div
      className={
        cheio
          ? "mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
          : "mb-4 flex items-start gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 text-sm text-suave"
      }
    >
      <Users className="mt-0.5 size-4 shrink-0" />
      <p>
        <b>
          Plano {nome}: {ativos} de {limite} alunos ativos.
        </b>{" "}
        {cheio ? textoLimiteAtingido(professor, limite) : "Aluno inativo não conta no limite."}
      </p>
    </div>
  );
}
