import type { Metadata } from "next";
import { Suspense } from "react";

import { Cabecalho, EsqueletoPagina } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";

import { FormConfiguracoes } from "./form-configuracoes";

export const metadata: Metadata = { title: "Configurações" };

export default function PaginaConfiguracoes() {
  return (
    <>
      <Cabecalho titulo="Configurações" descricao="Seus dados aparecem nos recibos; a chave Pix aparece no portal do aluno." />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  const { senhaHash, ...professor } = await exigirProfessor();
  void senhaHash;
  return <FormConfiguracoes professor={professor} />;
}
