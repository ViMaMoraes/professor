import { Crown, ShieldCheck, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { alternarProfessor } from "@/app/acoes/admin";
import { BotaoAcao } from "@/components/botao-acao";
import { BotaoLink, Cabecalho, Card, Selo, Tabela } from "@/components/ui";
import { contaLiberada, exigirMaster } from "@/lib/auth";
import { listarProfessores } from "@/lib/consultas";
import { dataBR, hojeISO } from "@/lib/formato";

export const metadata: Metadata = { title: "Administração" };

export default async function PaginaAdmin() {
  const master = await exigirMaster();
  const linhas = await listarProfessores();
  const hoje = hojeISO();
  const clientes = linhas.filter((l) => !l.professor.master);
  const liberados = clientes.filter((l) => contaLiberada(l.professor, hoje)).length;

  return (
    <>
      <Cabecalho titulo="Administração" descricao="Contas dos professores que usam o site. Cada professor só vê os próprios alunos e dados.">
        <BotaoLink href="/admin/novo">
          <UserPlus /> Novo professor
        </BotaoLink>
      </Cabecalho>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-suave">Professores clientes</p>
          <p className="mt-2 text-2xl font-semibold">{clientes.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-suave">Com acesso liberado</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{liberados}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-suave">Bloqueados ou vencidos</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{clientes.length - liberados}</p>
        </Card>
      </div>

      <Card>
        <Tabela>
          <thead>
            <tr>
              <th>Professor</th>
              <th>Alunos ativos</th>
              <th>Cliente desde</th>
              <th>Acesso até</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ professor: p, alunosAtivos }) => {
              const liberado = contaLiberada(p, hoje);
              const vencido = p.ativo && !liberado;
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/${p.id}`} className="font-medium hover:text-marca-texto">
                      {p.nome}
                    </Link>
                    {p.id === master.id && <span className="ml-1 text-xs text-suave">(você)</span>}
                    <div className="text-xs text-suave">{p.email}</div>
                  </td>
                  <td className="tabular-nums">{alunosAtivos}</td>
                  <td className="tabular-nums">{dataBR(p.criadoEm)}</td>
                  <td className="tabular-nums">{p.master ? "—" : p.acessoAte ? dataBR(p.acessoAte) : "sem limite"}</td>
                  <td>
                    {p.master ? (
                      <Selo cor="marca">
                        <Crown className="size-3" /> master
                      </Selo>
                    ) : vencido ? (
                      <Selo cor="amarelo">vencido</Selo>
                    ) : liberado ? (
                      <Selo cor="verde">
                        <ShieldCheck className="size-3" /> liberado
                      </Selo>
                    ) : (
                      <Selo cor="vermelho">bloqueado</Selo>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {!p.master && (
                      <BotaoAcao
                        acao={alternarProfessor.bind(null, p.id)}
                        variante={p.ativo ? "perigo" : "secundario"}
                        tamanho="sm"
                        confirmar={p.ativo ? `Bloquear o acesso de ${p.nome} e dos alunos dele?` : undefined}
                      >
                        {p.ativo ? "Bloquear" : "Liberar"}
                      </BotaoAcao>
                    )}{" "}
                    <BotaoLink href={`/admin/${p.id}`} variante="secundario" tamanho="sm">
                      Editar
                    </BotaoLink>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Tabela>
      </Card>
      <p className="mt-3 text-xs text-suave">
        Bloqueado ou vencido: o professor e os alunos dele não conseguem entrar, mas nenhum dado é apagado. Liberando (ou renovando a data), tudo
        volta como estava.
      </p>
    </>
  );
}
