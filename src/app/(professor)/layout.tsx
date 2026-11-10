import { BancoDesatualizado } from "@/components/banco-desatualizado";
import { CaixaUsuario } from "@/components/caixa-usuario";
import { MenuLateral } from "@/components/menu-lateral";
import { exigirAcesso } from "@/lib/auth";
import { migracoesPendentes } from "@/lib/db";
import { ehEstudio } from "@/lib/planos";

export default async function LayoutProfessor({ children }: LayoutProps<"/">) {
  const pendentes = await migracoesPendentes();
  if (pendentes.length) return <BancoDesatualizado pendentes={pendentes} />;
  // checa o login antes de qualquer coisa: visitante sem sessão recebe redirecionamento direto
  const { professor, membro, acesso } = await exigirAcesso();
  // quem é da equipe vê o próprio nome e, embaixo, o estúdio em que está
  const detalhe = membro ? (professor.nomeEstudio ?? professor.nome) : professor.email;
  return (
    <>
      <MenuLateral
        master={professor.master}
        estudio={ehEstudio(professor)}
        acesso={acesso}
        rodape={<CaixaUsuario nome={(membro ?? professor).nome} detalhe={detalhe} />}
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
