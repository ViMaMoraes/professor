"use client";

import { GraduationCap, LogIn, UserRound, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { entrar, entrarAluno } from "@/app/acoes/auth";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, cn, Input } from "@/components/ui";
import { assinarAcessos, esquecerAcesso, lerAcessos, type AcessoSalvo } from "@/lib/acessos-salvos";
import { primeiroNome } from "@/lib/formato";

type Acesso = "professor" | "aluno";

/** Login com duas abas: professor (e-mail e senha) e aluno (usuário e código do professor, sem senha). */
export function FormLogin({
  inicial = "professor",
  usuarioInicial,
  codigoInicial,
}: {
  inicial?: Acesso;
  usuarioInicial?: string;
  codigoInicial?: string;
}) {
  const [escolhido, setAcesso] = useState<Acesso | null>(null);
  // aparelho com conta de aluno lembrada (ex.: app instalado pelo aluno): abre na aba do aluno
  const temContaLembrada = useSyncExternalStore(assinarAcessos, () => lerAcessos().length > 0, () => false);
  const acesso = escolhido ?? (temContaLembrada ? "aluno" : inicial);
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-fundo p-1" role="tablist">
        {(
          [
            { valor: "professor", nome: "Acesso professor", Icone: GraduationCap },
            { valor: "aluno", nome: "Acesso aluno", Icone: UserRound },
          ] as const
        ).map(({ valor, nome, Icone }) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={acesso === valor}
            onClick={() => setAcesso(valor)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
              acesso === valor ? "bg-superficie shadow-sm" : "text-suave hover:text-texto",
            )}
          >
            <Icone className="size-4" /> {nome}
          </button>
        ))}
      </div>

      {acesso === "professor" ? (
        <Formulario key="professor" acao={entrar} className="flex flex-col gap-4">
          <Campo rotulo="E-mail">
            <Input type="email" name="email" required autoFocus autoComplete="email" />
          </Campo>
          <Campo rotulo="Senha">
            <Input type="password" name="senha" required autoComplete="current-password" />
          </Campo>
          <BotaoEnviar className="mt-2 w-full">
            <LogIn /> Entrar
          </BotaoEnviar>
        </Formulario>
      ) : (
        <AcessoAluno usuarioInicial={usuarioInicial} codigoInicial={codigoInicial} />
      )}
    </>
  );
}

const nenhum: AcessoSalvo[] = [];

/**
 * Acesso aluno. Contas que já entraram neste aparelho aparecem como botões ("Entrar como Ana"),
 * sem precisar lembrar usuário e código; quem veio pelo link pessoal vê o formulário já preenchido.
 */
function AcessoAluno({ usuarioInicial, codigoInicial }: { usuarioInicial?: string; codigoInicial?: string }) {
  const salvos = useSyncExternalStore(assinarAcessos, lerAcessos, () => nenhum);
  // "auto": lista se houver conta lembrada, a não ser que o link seja de outra conta (aí, o formulário preenchido)
  const [modo, setModo] = useState<"auto" | "lista" | "outro">("auto");
  const outro = modo === "outro";
  const doLink = usuarioInicial && !salvos.some((a) => a.usuario === usuarioInicial && (!codigoInicial || a.codigo === codigoInicial));
  const mostrarFormulario = salvos.length === 0 || outro || (modo === "auto" && doLink);

  return (
    <div className="flex flex-col gap-4">
      {!mostrarFormulario && (
        <>
          <p className="text-center text-sm text-suave">Toque no seu nome para entrar.</p>
          <ul className="flex flex-col gap-2">
            {salvos.map((a) => (
              <li key={`${a.codigo}|${a.usuario}`} className="flex items-stretch gap-1">
                <Formulario acao={entrarAluno} className="min-w-0 flex-1">
                  <input type="hidden" name="usuario" value={a.usuario} />
                  <input type="hidden" name="codigo" value={a.codigo} />
                  <BotaoEnviar variante="secundario" className="h-auto w-full justify-start py-2.5 text-left">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-suave text-sm font-semibold text-marca-texto">
                      {a.nome[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate font-medium">Entrar como {primeiroNome(a.nome)}</span>
                      <span className="block truncate text-xs font-normal text-suave">
                        {a.professor ? `${a.professor} · ` : ""}
                        {a.usuario}
                      </span>
                    </span>
                  </BotaoEnviar>
                </Formulario>
                <button
                  type="button"
                  onClick={() => esquecerAcesso(a)}
                  className="rounded-lg px-2 text-suave hover:bg-fundo hover:text-texto"
                  title={`Tirar ${primeiroNome(a.nome)} deste aparelho`}
                  aria-label={`Tirar ${primeiroNome(a.nome)} deste aparelho`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setModo("outro")} className="text-center text-sm font-medium text-marca-texto hover:underline">
            Entrar com outro usuário
          </button>
        </>
      )}

      {mostrarFormulario && (
        <Formulario key="aluno" acao={entrarAluno} className="flex flex-col gap-4">
          {usuarioInicial && !outro && <p className="text-center text-sm text-suave">Confira seus dados e toque em Entrar.</p>}
          <Campo rotulo="Usuário" dica="O usuário que seu professor te passou.">
            <Input
              name="usuario"
              required
              autoFocus={!usuarioInicial || outro}
              defaultValue={outro ? undefined : usuarioInicial}
              autoComplete="username"
              autoCapitalize="none"
              placeholder="ex.: julia.ramos"
            />
          </Campo>
          <Campo
            rotulo="Código do professor"
            dica={
              codigoInicial && !outro
                ? "Já veio no link do seu professor."
                : "Vem no link que seu professor mandou. Se você sempre entrou só com o usuário, pode deixar em branco."
            }
          >
            <Input
              name="codigo"
              defaultValue={outro ? undefined : codigoInicial}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ex.: marcus"
            />
          </Campo>
          <BotaoEnviar className="mt-2 w-full">
            <LogIn /> Entrar
          </BotaoEnviar>
          <p className="text-center text-xs text-suave">Depois da primeira vez, este aparelho lembra de você.</p>
          {salvos.length > 0 && (
            <button type="button" onClick={() => setModo("lista")} className="text-center text-sm font-medium text-marca-texto hover:underline">
              Voltar para as contas deste aparelho
            </button>
          )}
        </Formulario>
      )}
    </div>
  );
}
