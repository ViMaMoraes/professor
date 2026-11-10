"use client";

import { CalendarDays, CalendarX2, LoaderCircle, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { avisarFalta, desfazerAvisoFalta } from "@/app/acoes/agenda";
import { useInterface } from "@/components/interface";
import { Botao, Card, CardTitulo, cn, Selo } from "@/components/ui";

export type AulaDoAluno = {
  chave: string;
  data: string;
  hora: string | null;
  /** "segunda, 10/11" */
  quando: string;
  /** estúdio: "Piano com Paula" */
  curso: string | null;
  reposicao: boolean;
  desmarcadaPor: "professor" | "aluno" | null;
  motivo: string | null;
  /** ainda dá para avisar a falta (mais de 2 horas antes) */
  podeAvisar: boolean;
};

/** Próximas aulas na área do aluno, com "Não vou poder ir". */
export function ProximasAulas({ aulas, reposicoesAMarcar }: { aulas: AulaDoAluno[]; reposicoesAMarcar: number }) {
  const { confirmar, notificar } = useInterface();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  async function naoVou(a: AulaDoAluno) {
    const ok = await confirmar({
      titulo: "Avisar que não vai?",
      mensagem: `Aula de ${a.quando}${a.hora ? ` às ${a.hora}` : ""}. O professor recebe o aviso. Faltas avisadas não geram reposição automaticamente: o professor decide.`,
      confirmar: "Avisar professor",
    });
    if (!ok) return;
    iniciar(async () => {
      const r = await avisarFalta(a.data, a.hora ?? "");
      notificar(r.erro ?? r.ok ?? "", r.erro ? "erro" : "ok");
      router.refresh();
    });
  }

  function vou(a: AulaDoAluno) {
    iniciar(async () => {
      const r = await desfazerAvisoFalta(a.data, a.hora ?? "");
      notificar(r.erro ?? r.ok ?? "", r.erro ? "erro" : "ok");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardTitulo icone={<CalendarDays />}>Próximas aulas</CardTitulo>
      {reposicoesAMarcar > 0 && (
        <p className="border-b border-borda px-5 py-3 text-sm text-suave">
          Você tem {reposicoesAMarcar} {reposicoesAMarcar === 1 ? "reposição" : "reposições"} a marcar. O professor vai combinar o horário com você.
        </p>
      )}
      {aulas.length === 0 ? (
        <p className="p-5 text-sm text-suave">Nenhuma aula marcada para os próximos dias.</p>
      ) : (
        <ul className="divide-y divide-borda">
          {aulas.map((a) => (
            <li key={a.chave} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-sm">
              <div className={cn("min-w-0 flex-1", a.desmarcadaPor && "text-suave")}>
                <p className={cn("font-medium first-letter:uppercase", a.desmarcadaPor && "line-through")}>
                  {a.quando}
                  {a.hora && ` às ${a.hora}`}
                </p>
                {a.curso && <p className="text-xs text-suave">{a.curso}</p>}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {a.reposicao && <Selo cor="azul">reposição</Selo>}
                  {a.desmarcadaPor === "professor" && <Selo>desmarcada pelo professor{a.motivo ? ` · ${a.motivo}` : ""}</Selo>}
                  {a.desmarcadaPor === "aluno" && <Selo cor="amarelo">você avisou que não vai</Selo>}
                </div>
              </div>
              {a.podeAvisar && !a.desmarcadaPor && !a.reposicao && (
                <Botao variante="secundario" tamanho="sm" disabled={pendente} onClick={() => naoVou(a)}>
                  {pendente ? <LoaderCircle className="animate-spin" /> : <CalendarX2 />} Não vou poder ir
                </Botao>
              )}
              {a.desmarcadaPor === "aluno" && a.podeAvisar && (
                <Botao variante="fantasma" tamanho="sm" disabled={pendente} onClick={() => vou(a)}>
                  <Undo2 /> Vou poder ir sim
                </Botao>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
