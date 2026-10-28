import { CalendarCheck, CloudDownload, Pencil, ReceiptText, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { alternarSituacao, excluirAluno } from "@/app/acoes/alunos";
import { BotaoAcao } from "@/components/botao-acao";
import { SeloPresenca } from "@/components/selos";
import { BotaoLink, Card, CardTitulo, EsqueletoPagina, Selo, Voltar } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { enderecoSite } from "@/lib/endereco";
import {
  buscarAluno,
  buscarInstituicao,
  diarioDoAluno,
  frequenciaDoAluno,
  materiaisDoAluno,
  presencasDoAluno,
  recibosDoAluno,
} from "@/lib/consultas";
import { dataBR, hojeISO, moeda, numeroRecibo } from "@/lib/formato";

import { CompartilharAcesso } from "./compartilhar-acesso";
import { DiarioAluno } from "./diario-aluno";
import { MensagemAluno } from "./mensagem-aluno";

export default function PaginaAluno(props: PageProps<"/alunos/[id]">) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo params={props.params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/alunos/[id]">["params"] }) {
  const professor = await exigirProfessor();
  const id = Number((await params).id);
  const aluno = await buscarAluno(professor.id, id);
  if (!aluno) notFound();
  const [presencas, frequencia, recibos, materiais, instituicao, diario] = await Promise.all([
    presencasDoAluno(id, 15),
    frequenciaDoAluno(id),
    recibosDoAluno(id),
    materiaisDoAluno(aluno),
    aluno.instituicaoId ? buscarInstituicao(professor.id, aluno.instituicaoId) : undefined,
    diarioDoAluno(id),
  ]);

  return (
    <>
      <Voltar href="/alunos">Voltar para alunos</Voltar>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-marca-suave text-xl font-semibold text-marca-texto">
            {aluno.nome[0]?.toUpperCase()}
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {aluno.nome} {!aluno.ativo && <Selo>inativo</Selo>}
            </h1>
            <p className="text-sm text-suave">
              {[aluno.instrumento ?? "Curso não informado", aluno.nivel, aluno.diaAula && `${aluno.diaAula} ${aluno.horario ?? ""}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotaoLink href={`/recibos/novo?aluno=${aluno.id}`} tamanho="sm">
            <ReceiptText /> Gerar recibo
          </BotaoLink>
          <BotaoLink href={`/alunos/${aluno.id}/editar`} variante="secundario" tamanho="sm">
            <Pencil /> Editar
          </BotaoLink>
          <BotaoAcao acao={alternarSituacao.bind(null, aluno.id)} variante="secundario" tamanho="sm">
            {aluno.ativo ? <ToggleLeft /> : <ToggleRight />} {aluno.ativo ? "Desativar" : "Reativar"}
          </BotaoAcao>
          <BotaoAcao
            acao={excluirAluno.bind(null, aluno.id)}
            confirmar={`Excluir ${aluno.nome} e todo o histórico (chamadas e recibos)? Isso não pode ser desfeito.`}
            variante="perigo"
            tamanho="sm"
          >
            <Trash2 /> Excluir
          </BotaoAcao>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6">
          {aluno.usuario && aluno.ativo && <CompartilharAcesso nome={aluno.nome} usuario={aluno.usuario} telefone={aluno.telefone} endereco={enderecoSite()} />}
          {aluno.usuario && aluno.ativo && <MensagemAluno alunoId={aluno.id} mensagem={aluno.mensagem} />}
          <Card>
            <CardTitulo>Dados</CardTitulo>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 p-5 text-sm">
              <Item rotulo="Telefone">{aluno.telefone}</Item>
              <Item rotulo="E-mail">{aluno.email}</Item>
              <Item rotulo="Responsável">{aluno.responsavel}</Item>
              <Item rotulo="Instituição">
                {instituicao && (
                  <Link href={`/instituicoes/${instituicao.id}`} className="text-marca-texto hover:underline">
                    {instituicao.nome}
                  </Link>
                )}
              </Item>
              <Item rotulo="Nascimento">{aluno.dataNascimento && dataBR(aluno.dataNascimento)}</Item>
              <Item rotulo="Início">{aluno.dataInicio && dataBR(aluno.dataInicio)}</Item>
              <Item rotulo="Mensalidade">{aluno.mensalidadeCentavos != null && moeda(aluno.mensalidadeCentavos)}</Item>
              <Item rotulo="Frequência">{frequencia != null && `${frequencia}%`}</Item>
              <Item rotulo="Usuário">
                {aluno.usuario ? <span className="font-mono text-xs">{aluno.usuario}</span> : <Selo>sem acesso</Selo>}
              </Item>
            </dl>
            {aluno.observacoes && (
              <p className="border-t border-borda p-5 text-sm whitespace-pre-line text-suave">{aluno.observacoes}</p>
            )}
          </Card>
          <Card>
            <CardTitulo icone={<CloudDownload />}>Materiais disponíveis</CardTitulo>
            <ul className="space-y-2 p-5 text-sm">
              {materiais.length === 0 && <li className="text-suave">Nenhum material.</li>}
              {materiais.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <a href={`/api/materiais/${m.id}`} target="_blank" rel="noopener" className="truncate hover:text-marca-texto">
                    {m.titulo}
                  </a>
                  {m.paraTodos && <Selo>todos</Selo>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-2">
          <DiarioAluno alunoId={aluno.id} registros={diario} hoje={hojeISO()} />
          <Card>
            <CardTitulo
              icone={<CalendarCheck />}
              acao={
                <Link href={`/chamada/historico?aluno=${aluno.id}&inicio=2000-01-01`} className="text-sm text-marca-texto hover:underline">
                  Ver histórico
                </Link>
              }
            >
              Últimas aulas
            </CardTitulo>
            {presencas.length === 0 ? (
              <p className="p-5 text-sm text-suave">Nenhuma chamada registrada.</p>
            ) : (
              <ul className="divide-y divide-borda">
                {presencas.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                    <span className="w-24 tabular-nums">{dataBR(p.data)}</span>
                    <SeloPresenca status={p.status} />
                    <span className="truncate text-suave">{p.observacao}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitulo icone={<ReceiptText />}>Recibos</CardTitulo>
            {recibos.length === 0 ? (
              <p className="p-5 text-sm text-suave">Nenhum recibo emitido.</p>
            ) : (
              <ul className="divide-y divide-borda">
                {recibos.map((r) => (
                  <li key={r.id}>
                    <Link href={`/recibos/${r.id}`} className="flex items-center gap-4 px-5 py-2.5 text-sm hover:bg-fundo/60">
                      <span className="font-mono text-xs text-suave">#{numeroRecibo(r.numero)}</span>
                      <span className="w-24 tabular-nums">{dataBR(r.dataPagamento)}</span>
                      <span className="min-w-0 flex-1 truncate">{r.referente}</span>
                      <span className="font-medium tabular-nums">{moeda(r.valorCentavos)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-suave">{rotulo}</dt>
      <dd className="min-w-0 break-words">{children || "—"}</dd>
    </>
  );
}
