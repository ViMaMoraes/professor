"use client";

import { Check, CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { conferirUsuario, salvarAluno } from "@/app/acoes/alunos";
import { EditorHorarios } from "@/components/editor-horarios";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { SelectVencimento } from "@/components/select-vencimento";
import { InputMascara } from "@/components/input-mascara";
import { BotaoLink, Campo, Card, Input, Select, Textarea } from "@/components/ui";
import { INSTRUMENTOS, NIVEIS } from "@/lib/constantes";
import type { Aluno } from "@/lib/db/schema";
import { centavosParaCampo } from "@/lib/formato";
import { normalizarUsuario, sugerirUsuario } from "@/lib/usuario";

type Props = {
  aluno?: Omit<Aluno, "senhaHash">;
  instituicoes: { id: number; nome: string }[];
  diaPadrao: number;
  horarios?: { diaSemana: number; hora: string | null; duracaoMin: number | null }[];
  duracaoPadrao: number;
  /** Mostra mensalidade, vencimento e descrição do recibo (a equipe sem o Financeiro não vê valores). */
  verValores?: boolean;
  /** Estúdio: professores da equipe que podem ser escolhidos para o aluno (só para quem atribui). */
  equipe?: { id: number; nome: string }[];
  equipeDoAluno?: number[];
};

export function FormAluno(props: Props) {
  // muda a cada "cadastrar outro": recria o formulário vazio (inclusive a sugestão de usuário)
  const [versao, setVersao] = useState(0);
  return <CamposAluno key={versao} {...props} limpar={() => setVersao((v) => v + 1)} />;
}

function CamposAluno({
  aluno,
  instituicoes,
  diaPadrao,
  horarios,
  duracaoPadrao,
  verValores = true,
  equipe,
  equipeDoAluno,
  limpar,
}: Props & { limpar: () => void }) {
  const [usuario, setUsuario] = useState(aluno?.usuario ?? "");
  // num aluno novo, o usuário vai sendo sugerido enquanto o nome é digitado (até ser editado à mão)
  const [mexeuNoUsuario, setMexeuNoUsuario] = useState(Boolean(aluno));
  const acao = salvarAluno.bind(null, aluno?.id ?? null);
  const conferencia = useConferenciaUsuario(usuario, aluno?.id ?? null, aluno?.usuario ?? null, (sugestao) => {
    // usuário sugerido pelo nome já é de outro aluno seu: troca sozinho pela variação livre
    if (!mexeuNoUsuario) setUsuario(sugestao);
  });
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
          <Campo rotulo="Horários de aula" dica="Pode ter mais de um por semana. Aparecem na Agenda e geram o lembrete do aluno." className="sm:col-span-2 lg:col-span-3">
            <EditorHorarios iniciais={horarios ?? []} duracaoPadrao={duracaoPadrao} />
          </Campo>
          {equipe && equipe.length > 0 && (
            <fieldset className="sm:col-span-2 lg:col-span-3">
              <legend className="mb-1.5 text-sm font-medium">Professores do aluno</legend>
              <p className="mb-2 text-xs text-suave">Quem da equipe dá aula para ele. Pode marcar mais de um; você sempre vê todos os alunos.</p>
              <div className="flex flex-wrap gap-2">
                {equipe.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda px-3 py-1.5 text-sm has-checked:border-marca has-checked:bg-marca-suave">
                    <input type="checkbox" name="equipe" value={m.id} defaultChecked={equipeDoAluno?.includes(m.id)} className="size-4 accent-marca" />
                    {m.nome}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {verValores && (
            <>
              <Campo rotulo="Mensalidade (R$)">
                <Input name="mensalidade" inputMode="decimal" placeholder="150,00" defaultValue={centavosParaCampo(aluno?.mensalidadeCentavos)} />
              </Campo>
              <Campo rotulo="Vencimento" dica="Dia do mês em que a mensalidade vence (Financeiro).">
                <SelectVencimento name="diaVencimento" valor={aluno?.diaVencimento} padrao={diaPadrao} />
              </Campo>
            </>
          )}
          <Campo rotulo="Início das aulas">
            <Input type="date" name="dataInicio" defaultValue={aluno?.dataInicio ?? ""} />
          </Campo>
          {verValores && (
            <Campo rotulo="Descrição do pagamento (recibo)" dica="Ex.: “às aulas de piano”. Vem preenchida ao gerar o recibo." className="sm:col-span-2 lg:col-span-3">
              <Input name="descricaoRecibo" placeholder="às aulas de piano" defaultValue={aluno?.descricaoRecibo ?? ""} />
            </Campo>
          )}
          <Campo rotulo="Observações" className="sm:col-span-2 lg:col-span-3">
            <Textarea name="observacoes" rows={3} placeholder="Objetivos, conteúdo, preferências..." defaultValue={aluno?.observacoes ?? ""} />
          </Campo>
        </Secao>

        <Secao
          titulo="Acesso do aluno"
          descricao="O aluno entra em “Acesso aluno” com este usuário e o seu código de professor, sem senha (o link pessoal já leva os dois). Deixe vazio para não dar acesso."
        >
          <Campo rotulo="Usuário" dica="Sugerido a partir do nome; pode trocar. Use só letras, números e ponto. Só não pode repetir entre os seus alunos.">
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
              aria-invalid={conferencia?.livre === false && conferencia.mensagem ? true : undefined}
            />
            {conferencia?.livre && (
              <span className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="size-3.5" /> Disponível
              </span>
            )}
            {conferencia?.livre === false && conferencia.mensagem && (
              <span className="mt-1 flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
                <CircleAlert className="mt-px size-3.5 shrink-0" />
                <span>
                  {conferencia.mensagem}{" "}
                  {conferencia.sugestao && (
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => {
                        setUsuario(conferencia.sugestao!);
                        setMexeuNoUsuario(true);
                      }}
                    >
                      Usar “{conferencia.sugestao}”
                    </button>
                  )}
                </span>
              </span>
            )}
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

type Conferencia = { usuario: string; livre: boolean; mensagem?: string; sugestao?: string };

/** Confere no servidor (com uma pausa enquanto digita) se o usuário já é de outro aluno do professor. */
function useConferenciaUsuario(usuario: string, alunoId: number | null, original: string | null, aoRepetir: (sugestao: string) => void) {
  const [resultado, setResultado] = useState<Conferencia | null>(null);
  const alvo = normalizarUsuario(usuario);
  useEffect(() => {
    // vazio, curto demais ou o mesmo usuário que o aluno já tem: nada a conferir
    if (alvo.length < 3 || alvo === original) return;
    let cancelado = false;
    const espera = setTimeout(async () => {
      try {
        const r = await conferirUsuario(alvo, alunoId);
        if (cancelado) return;
        setResultado({ usuario: alvo, ...r });
        if (!r.livre && r.sugestao) aoRepetir(r.sugestao);
      } catch {
        // sem conexão: a conferência acontece de novo ao salvar
      }
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confere só quando o usuário muda
  }, [alvo]);
  // resultado de um usuário que não é mais o do campo não vale
  return resultado?.usuario === alvo && alvo !== original ? resultado : null;
}
