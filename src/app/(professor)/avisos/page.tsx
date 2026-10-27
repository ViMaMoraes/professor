import { Bell, Trash2 } from "lucide-react";
import type { Metadata } from "next";

import { excluirAviso } from "@/app/acoes/avisos";
import { BotaoAcao } from "@/components/botao-acao";
import { Cabecalho, Card, CardTitulo, Selo, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { contarInscritos, listarAlunos, listarAvisos, listarInstituicoes } from "@/lib/consultas";
import { dataBR } from "@/lib/formato";
import { chavePublicaVapid } from "@/lib/push";

import { FormAviso } from "./form-aviso";

export const metadata: Metadata = { title: "Avisos" };

export default async function PaginaAvisos() {
  const professor = await exigirProfessor();
  const [avisos, alunos, instituicoes, inscritos] = await Promise.all([
    listarAvisos(professor.id),
    listarAlunos(professor.id),
    listarInstituicoes(professor.id),
    contarInscritos(professor.id),
  ]);
  const pushConfigurado = Boolean(chavePublicaVapid());

  return (
    <>
      <Cabecalho
        titulo="Avisos"
        descricao={
          pushConfigurado
            ? `O aviso aparece na área do aluno e chega como notificação no celular de quem ativou (${inscritos} ${inscritos === 1 ? "aluno" : "alunos"} hoje).`
            : "O aviso aparece na área do aluno. Para enviar também notificações no celular, configure o VAPID_PRIVATE_KEY (veja o README)."
        }
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FormAviso
            alunos={alunos.map(({ id, nome }) => ({ id, nome }))}
            instituicoes={instituicoes.filter((i) => i.alunosAtivos > 0).map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))}
          />
        </div>
        <Card className="self-start lg:col-span-2">
          <CardTitulo icone={<Bell />}>Enviados</CardTitulo>
          {avisos.length === 0 ? (
            <Vazio icone={<Bell />} titulo="Nenhum aviso ainda" />
          ) : (
            <ul className="divide-y divide-borda">
              {avisos.map(({ aviso, destinatarios }) => (
                <li key={aviso.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{aviso.titulo}</p>
                    {aviso.mensagem && <p className="mt-0.5 line-clamp-3 text-sm whitespace-pre-line text-suave">{aviso.mensagem}</p>}
                    <p className="mt-1 flex items-center gap-2 text-xs text-suave">
                      {dataBR(aviso.criadoEm)}
                      <Selo>{aviso.paraTodos ? "Todos" : `${destinatarios} ${destinatarios === 1 ? "aluno" : "alunos"}`}</Selo>
                    </p>
                  </div>
                  <BotaoAcao
                    acao={excluirAviso.bind(null, aviso.id)}
                    confirmar="Excluir este aviso?"
                    detalhe="Ele some da área dos alunos."
                    sucesso="Aviso excluído."
                    variante="perigo"
                    tamanho="icone"
                    aria-label="Excluir aviso"
                  >
                    <Trash2 />
                  </BotaoAcao>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
