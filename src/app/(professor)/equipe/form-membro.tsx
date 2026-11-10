"use client";

import { Check, UserPlus } from "lucide-react";
import { useState } from "react";

import { criarMembro, salvarMembro } from "@/app/acoes/equipe";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, Input } from "@/components/ui";
import { CARGOS, LISTA_MODULOS, lerModulos, MODULOS, type Cargo, type Modulo } from "@/lib/permissoes";

import { Credenciais } from "../admin/credenciais";

type Dados = { id: number; nome: string; email: string; cargo: Cargo; modulos: string; todosAlunos: boolean; ativo: boolean };

function Campos({ membro }: { membro?: Dados }) {
  const [cargo, setCargo] = useState<Cargo>(membro?.cargo ?? "professor");
  const [modulos, setModulos] = useState<Modulo[]>(membro ? lerModulos(membro.modulos) : CARGOS.professor.modulos);
  const [todosAlunos, setTodosAlunos] = useState(membro?.todosAlunos ?? CARGOS.professor.todosAlunos);

  // escolher um cargo preenche as caixinhas com o modelo; depois dá para ajustar uma a uma
  const escolherCargo = (novo: Cargo) => {
    setCargo(novo);
    setModulos(CARGOS[novo].modulos);
    setTodosAlunos(CARGOS[novo].todosAlunos);
  };

  return (
    <>
      <Campo rotulo="Nome *">
        <Input name="nome" required defaultValue={membro?.nome} />
      </Campo>
      <Campo rotulo="E-mail (login) *">
        <Input type="email" name="email" required defaultValue={membro?.email} />
      </Campo>

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium">Cargo</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(CARGOS) as Cargo[]).map((c) => (
            <label
              key={c}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-borda p-3 has-checked:border-marca has-checked:bg-marca-suave"
            >
              <input
                type="radio"
                name="cargo"
                value={c}
                checked={cargo === c}
                onChange={() => escolherCargo(c)}
                className="mt-1 size-4 accent-marca"
              />
              <span>
                <span className="block text-sm font-medium">{CARGOS[c].nome}</span>
                <span className="block text-xs text-suave">{CARGOS[c].descricao}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium">O que pode ver</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LISTA_MODULOS.map((m) => (
            <label
              key={m}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda px-3 py-2 text-sm has-checked:border-marca has-checked:bg-marca-suave"
            >
              <input
                type="checkbox"
                name="modulos"
                value={m}
                checked={modulos.includes(m)}
                onChange={(e) => setModulos((atual) => (e.target.checked ? [...atual, m] : atual.filter((x) => x !== m)))}
                className="size-4 accent-marca"
              />
              {MODULOS[m]}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-suave">
          Configurações e Equipe ficam sempre só com você. Sem “Financeiro e valores”, não aparece mensalidade nem valor.
        </p>
      </fieldset>

      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="todosAlunos"
          checked={todosAlunos}
          onChange={(e) => setTodosAlunos(e.target.checked)}
          className="mt-0.5 size-4 accent-marca"
        />
        <span>
          Vê todos os alunos do estúdio
          <span className="block text-xs text-suave">
            Desmarcado: vê só os alunos de que é professor (você escolhe no cadastro de cada aluno, em “Professores do aluno”).
          </span>
        </span>
      </label>

      {membro && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="ativo" defaultChecked={membro.ativo} className="size-4 accent-marca" />
          Acesso liberado (desmarque para bloquear sem apagar nada)
        </label>
      )}
    </>
  );
}

export function FormMembro({ membro }: { membro: Dados }) {
  return (
    <Formulario acao={salvarMembro.bind(null, membro.id)} className="max-w-2xl">
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Campos membro={membro} />
        <div className="flex gap-2 sm:col-span-2">
          <BotaoEnviar>
            <Check /> Salvar
          </BotaoEnviar>
          <BotaoLink href="/equipe" variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}

export function FormNovoMembro({ endereco }: { endereco: string | null }) {
  return (
    <Formulario
      acao={criarMembro}
      className="max-w-2xl"
      sucesso={(estado) => (
        <div className="space-y-4">
          <Credenciais nome={estado.nome!} email={estado.email!} senha={estado.senha!} nova endereco={endereco} />
          <div className="flex gap-2">
            <BotaoLink href="/equipe">Voltar para a equipe</BotaoLink>
            <BotaoLink href={`/equipe/${estado.id}`} variante="secundario">
              Ver cadastro
            </BotaoLink>
          </div>
        </div>
      )}
    >
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Campos />
        <p className="text-sm text-suave sm:col-span-2">
          A senha é gerada automaticamente. Depois de salvar, você copia os dados de acesso para enviar; no primeiro login a pessoa cria a
          própria senha. Ela entra pela aba “Acesso professor”.
        </p>
        <div className="flex gap-2 sm:col-span-2">
          <BotaoEnviar>
            <UserPlus /> Adicionar à equipe
          </BotaoEnviar>
          <BotaoLink href="/equipe" variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}
