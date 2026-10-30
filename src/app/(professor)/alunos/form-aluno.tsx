"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { salvarAluno } from "@/app/acoes/alunos";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { InputMascara } from "@/components/input-mascara";
import { BotaoLink, Campo, Card, Input, Select, Textarea } from "@/components/ui";
import { DIAS_SEMANA, INSTRUMENTOS, NIVEIS } from "@/lib/constantes";
import type { Aluno } from "@/lib/db/schema";
import { centavosParaCampo } from "@/lib/formato";
import { sugerirUsuario } from "@/lib/usuario";

type Props = { aluno?: Omit<Aluno, "senhaHash">; instituicoes: { id: number; nome: string }[] };

export function FormAluno(props: Props) {
  // muda a cada "cadastrar outro": recria o formulário vazio (inclusive a sugestão de usuário)
  const [versao, setVersao] = useState(0);
  return <CamposAluno key={versao} {...props} limpar={() => setVersao((v) => v + 1)} />;
}

function CamposAluno({ aluno, instituicoes, limpar }: Props & { limpar: () => void }) {
  const [usuario, setUsuario] = useState(aluno?.usuario ?? "");
  // num aluno novo, o usuário vai sendo sugerido enquanto o nome é digitado (até ser editado à mão)
  const [mexeuNoUsuario, setMexeuNoUsuario] = useState(Boolean(aluno));
  const acao = salvarAluno.bind(null, aluno?.id ?? null);
  return (
    <Formulario acao={acao} cadastrarOutro={aluno ? undefined : { lista: "/alunos", limpar }}>
      <Card className="divide-y divide-borda">
        <Secao titulo="Dados pessoais">
          <Campo rotulo="Nome *" className="sm:col-span-2">
            <Input
              name="nome"
              required
              defaultValue={aluno?.nome}
              onChange={(e) => !mexeuNoUsuario && setUsuario(sugerirUsuario(e.target.value))}
            />
          </Campo>
          <Campo rotulo="Telefone / WhatsApp">
            <InputMascara mascara="telefone" name="telefone" defaultValue={aluno?.telefone} />
          </Campo>
          <Campo rotulo="E-mail" dica="Para enviar o recibo.">
            <Input type="email" name="email" defaultValue={aluno?.email ?? ""} />
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
          <Campo rotulo="Curso / matéria" dica="Ex.: Violino, Inglês, Matemática.">
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
          <Campo rotulo="Descrição do pagamento (recibo)" dica="Ex.: “às aulas de piano”. Vem preenchida ao gerar o recibo." className="sm:col-span-2 lg:col-span-3">
            <Input name="descricaoRecibo" placeholder="às aulas de piano" defaultValue={aluno?.descricaoRecibo ?? ""} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2 lg:col-span-3">
            <Textarea name="observacoes" rows={3} placeholder="Objetivos, conteúdo, preferências..." defaultValue={aluno?.observacoes ?? ""} />
          </Campo>
        </Secao>

        <Secao
          titulo="Acesso aos downloads"
          descricao="O aluno entra em “Acesso aluno” só com este usuário (sem senha) e vê os materiais liberados para ele. Deixe vazio para não dar acesso."
        >
          <Campo rotulo="Usuário" dica="Sugerido a partir do nome; pode trocar. Use só letras, números e ponto.">
            <Input
              name="usuario"
              value={usuario}
              autoComplete="off"
              autoCapitalize="none"
              onChange={(e) => {
                setUsuario(e.target.value);
                setMexeuNoUsuario(true);
              }}
              placeholder="ex.: julia.ramos"
            />
          </Campo>
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

function Secao({ titulo, descricao, id, children }: { titulo: string; descricao?: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 p-5">
      <h2 className="font-semibold">{titulo}</h2>
      {descricao && <p className="mt-0.5 text-sm text-suave">{descricao}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
