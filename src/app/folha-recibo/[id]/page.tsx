import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FolhaRecibo } from "@/components/folha-recibo";
import { exigirProfessor } from "@/lib/auth";
import { buscarRecibo } from "@/lib/consultas";
import { pagadorDoRecibo } from "@/lib/pagador";

export const metadata: Metadata = { title: "Recibo" };

/** Só a folha do recibo, sem menu: é o que aparece na janela "Ver" da lista de recibos. */
export default async function PaginaFolhaRecibo(props: PageProps<"/folha-recibo/[id]">) {
  const professor = await exigirProfessor();
  const linha = await buscarRecibo(Number((await props.params).id), { professorId: professor.id });
  if (!linha) notFound();
  return (
    <main className="min-h-screen bg-white">
      <FolhaRecibo recibo={linha.recibo} pagador={pagadorDoRecibo(linha.aluno, linha.instituicao)} professor={professor} className="mx-auto max-w-3xl" />
    </main>
  );
}
