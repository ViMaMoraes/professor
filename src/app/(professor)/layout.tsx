import { Suspense } from "react";

import { CaixaUsuario } from "@/components/caixa-usuario";
import { MenuLateral } from "@/components/menu-lateral";
import { Esqueleto } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";

export default function LayoutProfessor({ children }: LayoutProps<"/">) {
  return (
    <>
      <MenuLateral
        rodape={
          <Suspense fallback={<Esqueleto className="h-14" />}>
            <Usuario />
          </Suspense>
        }
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}

async function Usuario() {
  const professor = await exigirProfessor();
  return <CaixaUsuario nome={professor.nome} detalhe={professor.email} />;
}
