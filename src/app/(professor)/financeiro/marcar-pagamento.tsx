"use client";

import { CircleCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { marcarPagamento } from "@/app/acoes/financeiro";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Botao, Campo, Input, Select } from "@/components/ui";
import { FORMAS_PAGAMENTO } from "@/lib/constantes";
import { centavosParaCampo } from "@/lib/formato";

/** "Marcar como pago": registra o pagamento do mês sem emitir recibo. */
export function MarcarPagamento({
  tipo,
  pagadorId,
  nome,
  referencia,
  nomeMes,
  faltaCentavos,
  hoje,
}: {
  tipo: "aluno" | "instituicao";
  pagadorId: number;
  nome: string;
  referencia: string;
  nomeMes: string;
  faltaCentavos: number;
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  return (
    <>
      <Botao tamanho="sm" onClick={() => setAberto(true)}>
        <CircleCheck /> Marcar pago
      </Botao>
      {aberto && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={() => setAberto(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="marcar-titulo"
            className="animate-entrar w-full max-w-md rounded-2xl bg-superficie p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="marcar-titulo" className="font-semibold">
                  Marcar como pago
                </h2>
                <p className="text-sm text-suave">
                  {nome} · {nomeMes}
                </p>
              </div>
              <button onClick={() => setAberto(false)} className="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-texto" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <Formulario acao={marcarPagamento} aoConcluir={() => setAberto(false)} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="tipo" value={tipo} />
              <input type="hidden" name="pagadorId" value={pagadorId} />
              <input type="hidden" name="referencia" value={referencia} />
              <Campo rotulo="Valor pago (R$) *">
                <Input name="valor" inputMode="decimal" required autoFocus defaultValue={centavosParaCampo(faltaCentavos)} />
              </Campo>
              <Campo rotulo="Data *">
                <Input type="date" name="dataPagamento" required defaultValue={hoje} />
              </Campo>
              <Campo rotulo="Forma de pagamento" className="sm:col-span-2">
                <Select name="formaPagamento" defaultValue="Pix">
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Observação" className="sm:col-span-2">
                <Input name="observacao" placeholder="Opcional" />
              </Campo>
              <p className="text-xs text-suave sm:col-span-2">
                Sem recibo. Se precisar, gere o recibo depois pela linha do pagamento: ele substitui esta marcação.
              </p>
              <div className="flex gap-2 sm:col-span-2">
                <BotaoEnviar>
                  <CircleCheck /> Confirmar pagamento
                </BotaoEnviar>
                <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
                  Cancelar
                </Botao>
              </div>
            </Formulario>
          </div>
        </div>
      )}
    </>
  );
}
