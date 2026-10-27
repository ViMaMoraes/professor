"use client";

import { Check } from "lucide-react";

import { salvarAluno } from "@/app/acoes/alunos";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, Input, Select, Textarea } from "@/components/ui";
import { DIAS_SEMANA, INSTRUMENTOS, NIVEIS } from "@/lib/constantes";
import type { Aluno } from "@/lib/db/schema";
import { centavosParaCampo } from "@/lib/formato";

export function FormAluno({
  aluno,
  instituicoes,
}: {
  aluno?: Omit<Aluno, "senhaHash"> & { temAcesso: boolean };
  instituicoes: { id: number; nome: string }[];
}) {
  const acao = salvarAluno.bind(null, aluno?.id ?? null);
  return (
    <Formulario acao={acao}>
      <Card className="divide-y divide-borda">
        <Secao titulo="Dados pessoais">
          <Campo rotulo="Nome *" className="sm:col-span-2">
            <Input name="nome" required defaultValue={aluno?.nome} />
          </Campo>
          <Campo rotulo="Telefone / WhatsApp">
            <Input name="telefone" placeholder="(11) 99999-9999" defaultValue={aluno?.telefone ?? ""} />
          </Campo>
          <Campo rotulo="Nascimento">
            <Input type="date" name="dataNascimento" defaultValue={aluno?.dataNascimento ?? ""} />
          </Campo>
          <Campo rotulo="Responsável" dica="Para alunos menores. Aparece no recibo." className="sm:col-span-2">
            <Input name="responsavel" defaultValue={aluno?.responsavel ?? ""} />
          </Campo>
          <Campo rotulo="Instituição" dica="Se uma escola, igreja ou projeto paga pelas aulas deste aluno.">
            <Select name="instituicaoId" defaultValue={aluno?.instituicaoId ?? ""}>
              <option value="">Nenhuma (particular)</option>
              {instituicoes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </Secao>

        <Secao titulo="Aulas">
          <Campo rotulo="Instrumento">
            <Input name="instrumento" list="instrumentos" defaultValue={aluno?.instrumento ?? ""} />
            <datalist id="instrumentos">
              {INSTRUMENTOS.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Nível">
            <Select name="nivel" defaultValue={aluno?.nivel ?? ""}>
              <option value="">—</option>
              {NIVEIS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Dia da aula">
            <Select name="diaAula" defaultValue={aluno?.diaAula ?? ""}>
              <option value="">—</option>
              {DIAS_SEMANA.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Horário">
            <Input type="time" name="horario" defaultValue={aluno?.horario ?? ""} />
          </Campo>
          <Campo rotulo="Mensalidade (R$)">
            <Input name="mensalidade" inputMode="decimal" placeholder="150,00" defaultValue={centavosParaCampo(aluno?.mensalidadeCentavos)} />
          </Campo>
          <Campo rotulo="Início das aulas">
            <Input type="date" name="dataInicio" defaultValue={aluno?.dataInicio ?? ""} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2 lg:col-span-3">
            <Textarea name="observacoes" rows={3} placeholder="Repertório, objetivos, músicas favoritas..." defaultValue={aluno?.observacoes ?? ""} />
          </Campo>
        </Secao>

        <Secao
          titulo="Acesso ao portal do aluno"
          descricao="Com e-mail e senha, o aluno entra no site e vê os materiais liberados para ele, os recibos e a frequência."
        >
          <Campo rotulo="E-mail (login)">
            <Input type="email" name="email" defaultValue={aluno?.email ?? ""} />
          </Campo>
          <Campo rotulo={aluno?.temAcesso ? "Nova senha" : "Senha"}>
            <Input
              name="senha"
              minLength={6}
              autoComplete="new-password"
              placeholder={aluno?.temAcesso ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
            />
          </Campo>
          {aluno?.temAcesso && (
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
              <input type="checkbox" name="removerAcesso" className="size-4 accent-marca" /> Remover acesso ao portal
            </label>
          )}
        </Secao>

        <div className="flex gap-2 p-5">
          <BotaoEnviar>
            <Check /> Salvar
          </BotaoEnviar>
          <BotaoLink variante="secundario" href={aluno ? `/alunos/${aluno.id}` : "/alunos"}>
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="p-5">
      <h2 className="font-semibold">{titulo}</h2>
      {descricao && <p className="mt-0.5 text-sm text-suave">{descricao}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
