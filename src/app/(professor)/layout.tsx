import { BancoDesatualizado } from "@/components/banco-desatualizado";
import { CaixaUsuario } from "@/components/caixa-usuario";
import { MenuLateral } from "@/components/menu-lateral";
import { exigirProfessor } from "@/lib/auth";
import { migracoesPendentes } from "@/lib/db";

export default async function LayoutProfessor({ children }: LayoutProps<"/">) {
  const pendentes = await migracoesPendentes();
  if (pendentes.length) return <BancoDesatualizado pendentes={pendentes} />;
  // checa o login antes de qualquer coisa: visitante sem sessão recebe redirecionamento direto
  const professor = await exigirProfessor();
  return (
    <>
      <MenuLateral master={professor.master} rodape={<CaixaUsuario nome={professor.nome} detalhe={professor.email} />} />
      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
