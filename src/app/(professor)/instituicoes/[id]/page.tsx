import { Building2, CalendarCheck, FileSpreadsheet, Pencil, ReceiptText, ToggleLeft, ToggleRight, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { alternarInstituicao, excluirInstituicao } from "@/app/acoes/instituicoes";
import { BotaoAcao } from "@/components/botao-acao";
import { BotaoLink, Card, CardTitulo, estiloBotao, Selo } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarInstituicao, historicoPresencas, listarAlunos, listarRecibos } from "@/lib/consultas";
import { dataBR, hojeISO, MESES, moeda, numeroRecibo } from "@/lib/formato";
import { contarPorAluno } from "@/lib/planilha-chamada";

export default async function PaginaInstituicao(props: PageProps<"/instituicoes/[id]">) {
  const professor = await exigirProfessor();
  const instituicao = await buscarInstituicao(professor.id, Number((await props.params).id));
  if (!instituicao) notFound();

  const hoje = hojeISO();
  const inicioMes = hoje.slice(0, 8) + "01";
  const [alunos, recibos, chamadasMes] = await Promise.all([
    listarAlunos(professor.id, { instituicaoId: instituicao.id, situacao: "todos" }),
    listarRecibos(professor.id, { instituicaoId: instituicao.id }),
    historicoPresencas(professor.id, inicioMes, hoje, undefined, instituicao.id),
  ]);
  const frequencia = new Map(
    contarPorAluno(chamadasMes.map(({ presenca, aluno }) => ({ ...presenca, aluno }))).map((r) => [r.aluno.id, r]),
  );
  const nomeMes = MESES[Number(hoje.slice(5, 7)) - 1];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-marca-suave text-marca-texto">
            <Building2 className="size-6" />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {instituicao.nome} {!instituicao.ativo && <Selo>inativa</Selo>}
            </h1>
            <p className="text-sm text-suave">
              {alunos.filter((a) => a.ativo).length} aluno(s) ativo(s)
              {instituicao.valorMensalCentavos != null && ` · ${moeda(instituicao.valorMensalCentavos)} por mês`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotaoLink href={`/recibos/novo?instituicao=${instituicao.id}`} tamanho="sm">
            <ReceiptText /> Gerar recibo
          </BotaoLink>
          <a
            href={`/api/chamada/planilha?instituicao=${instituicao.id}`}
            download
            className={estiloBotao({ variante: "sucesso", tamanho: "sm" })}
            title="Chamada do mês dos alunos desta instituição"
          >
            <FileSpreadsheet /> Chamada do mês
          </a>
          <BotaoLink href={`/instituicoes/${instituicao.id}/editar`} variante="secundario" tamanho="sm">
            <Pencil /> Editar
          </BotaoLink>
          <BotaoAcao acao={alternarInstituicao.bind(null, instituicao.id)} variante="secundario" tamanho="sm">
            {instituicao.ativo ? <ToggleLeft /> : <ToggleRight />} {instituicao.ativo ? "Desativar" : "Reativar"}
          </BotaoAcao>
          <BotaoAcao
            acao={excluirInstituicao.bind(null, instituicao.id)}
            confirmar={`Excluir ${instituicao.nome} e os recibos dela? Os alunos continuam cadastrados, só perdem o vínculo.`}
            variante="perigo"
            tamanho="sm"
          >
            <Trash2 /> Excluir
          </BotaoAcao>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitulo>Dados</CardTitulo>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 p-5 text-sm">
            <Item rotulo="CNPJ/CPF">{instituicao.documento}</Item>
            <Item rotulo="Contato">{instituicao.contato}</Item>
            <Item rotulo="Telefone">{instituicao.telefone}</Item>
            <Item rotulo="E-mail">{instituicao.email}</Item>
            <Item rotulo="Endereço">{instituicao.endereco}</Item>
          </dl>
          {instituicao.observacoes && (
            <p className="border-t border-borda p-5 text-sm whitespace-pre-line text-suave">{instituicao.observacoes}</p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitulo
            icone={<CalendarCheck />}
            acao={
              <Link
                href={`/chamada/historico?instituicao=${instituicao.id}&inicio=${inicioMes}&fim=${hoje}`}
                className="text-sm text-marca-texto hover:underline"
              >
                Ver histórico
              </Link>
            }
          >
            Alunos e frequência em {nomeMes}
          </CardTitulo>
          {alunos.length === 0 ? (
            <div className="p-5 text-sm text-suave">
              Nenhum aluno vinculado.{" "}
              <Link href={`/instituicoes/${instituicao.id}/editar`} className="text-marca-texto hover:underline">
                Escolher alunos
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-borda">
              {alunos.map((a) => {
                const f = frequencia.get(a.id);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <Users className="size-4 shrink-0 text-suave" />
                    <Link href={`/alunos/${a.id}`} className="flex-1 truncate font-medium hover:text-marca-texto">
                      {a.nome} {!a.ativo && <Selo className="ml-1">inativo</Selo>}
                    </Link>
                    {f ? (
                      <span className="flex items-center gap-2 text-xs text-suave">
                        <span>
                          {f.total.presente + f.total.reposicao} presença(s) · {f.total.falta} falta(s)
                          {f.total.justificada ? ` · ${f.total.justificada} justificada(s)` : ""}
                        </span>
                        <Selo cor={f.frequencia >= 0.75 ? "verde" : "amarelo"}>{Math.round(f.frequencia * 100)}%</Selo>
                      </span>
                    ) : (
                      <span className="text-xs text-suave">sem chamada no mês</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <CardTitulo icone={<ReceiptText />}>Recibos da instituição</CardTitulo>
          {recibos.length === 0 ? (
            <p className="p-5 text-sm text-suave">Nenhum recibo emitido para esta instituição.</p>
          ) : (
            <ul className="divide-y divide-borda">
              {recibos.map(({ recibo: r }) => (
                <li key={r.id}>
                  <Link href={`/recibos/${r.id}`} className="flex items-center gap-4 px-5 py-2.5 text-sm hover:bg-fundo/60">
                    <span className="font-mono text-xs text-suave">#{numeroRecibo(r.numero)}</span>
                    <span className="w-24 tabular-nums">{dataBR(r.dataPagamento)}</span>
                    <span className="flex-1 truncate">{r.referente}</span>
                    <span className="font-medium tabular-nums">{moeda(r.valorCentavos)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
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
