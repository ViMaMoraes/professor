import { Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import { excluirProfessor } from "@/app/acoes/admin";
import { BotaoAcao } from "@/components/botao-acao";
import { Cabecalho, Card } from "@/components/ui";
import { exigirMaster } from "@/lib/auth";
import { buscarProfessor } from "@/lib/consultas";

import { FormProfessor } from "../form-professor";
import { RedefinirSenha } from "./redefinir-senha";

export default async function PaginaEditarProfessor(props: PageProps<"/admin/[id]">) {
  const master = await exigirMaster();
  const professor = await buscarProfessor(Number((await props.params).id));
  if (!professor) notFound();
  // só o que o formulário usa (nada de senha ou assinatura indo para o navegador)
  const { id, nome, email, acessoAte, ativo, master: ehMaster } = professor;
  const dados = { id, nome, email, acessoAte, ativo, master: ehMaster };

  return (
    <>
      <Cabecalho titulo={professor.nome} descricao={professor.master ? "Conta master (administrador do site)." : "Conta de professor cliente."} />
      <FormProfessor professor={dados} />
      {professor.id !== master.id && (
        <div className="mt-6">
          <RedefinirSenha id={professor.id} nome={professor.nome} email={professor.email} pendente={professor.trocarSenha} />
        </div>
      )}
      {!professor.master && (
        <Card className="mt-6 max-w-2xl border-red-200 p-5 dark:border-red-900">
          <h2 className="font-semibold text-red-600 dark:text-red-400">Excluir conta</h2>
          <p className="mt-1 mb-4 text-sm text-suave">
            Apaga o professor e <b>todos</b> os dados dele: alunos, chamadas, recibos e materiais. Não dá para desfazer. Para só suspender o acesso,
            use “Conta liberada” acima.
          </p>
          <BotaoAcao
            acao={excluirProfessor.bind(null, professor.id)}
            confirmar={`Excluir ${professor.nome} e TODOS os dados dele? Isso não pode ser desfeito.`}
            variante="perigo"
          >
            <Trash2 /> Excluir professor e dados
          </BotaoAcao>
        </Card>
      )}
    </>
  );
}
