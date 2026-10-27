"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Botao, Input } from "@/components/ui";

export function CopiarPix({ chave }: { chave: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={chave} onFocus={(e) => e.target.select()} />
      <Botao
        variante="secundario"
        onClick={async () => {
          await navigator.clipboard.writeText(chave);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        {copiado ? <Check /> : <Copy />} {copiado ? "Copiado" : "Copiar"}
      </Botao>
    </div>
  );
}
