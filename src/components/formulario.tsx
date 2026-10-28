"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { createContext, startTransition, use, useActionState, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { useRouter } from "next/navigation";

import type { EstadoForm } from "@/lib/estado-form";

import { useInterface } from "./interface";
import { Botao, cn } from "./ui";

const Enviando = createContext(false);

/** Mensagem para o primeiro campo inválido (no lugar do balão padrão do navegador). */
function mensagemDoCampo(campo: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const rotulo = campo.closest("label")?.querySelector("span")?.textContent?.replace("*", "").trim();
  const nome = rotulo ? `“${rotulo}”` : "o campo destacado";
  const v = campo.validity;
  if (v.valueMissing) return `Preencha ${nome}.`;
  if (v.typeMismatch && campo.type === "email") return `Confira o e-mail em ${nome}.`;
  if (v.tooShort) return `${nome[0].toUpperCase() + nome.slice(1)} precisa ter pelo menos ${(campo as HTMLInputElement).minLength} caracteres.`;
  return `Confira ${nome}.`;
}

/**
 * Form ligado a uma Server Action, com mensagens no estilo do site.
 * - valida os campos obrigatórios sem os balões padrão do navegador (destaca o campo e mostra o motivo);
 * - erros aparecem no topo do formulário; sucesso aparece como aviso no canto da tela;
 * - envia via onSubmit (e não via prop `action`) para o React não limpar os campos quando há erro.
 */
export function Formulario<E extends EstadoForm>({
  acao,
  children,
  className,
  confirmar,
  limparAoEnviar,
  sucesso,
  aoConcluir,
  cadastrarOutro,
}: {
  acao: (estado: E, dados: FormData) => Promise<E>;
  children: ReactNode;
  className?: string;
  confirmar?: string;
  /** Limpa os campos depois de um envio com sucesso (ex.: formulário de envio de aviso). */
  limparAoEnviar?: boolean;
  /** Depois de um envio com sucesso, mostra isto no lugar do formulário (ex.: a senha gerada). */
  sucesso?: (estado: NonNullable<E>) => ReactNode;
  /** Chamado depois de cada envio com sucesso (ex.: sair do modo de edição). */
  aoConcluir?: () => void;
  /**
   * Depois de um cadastro novo (estado.criado), pergunta "Deseja cadastrar outro?":
   * Sim chama `limpar` (o formulário volta vazio); Não vai para a `lista`.
   */
  cadastrarOutro?: { lista: string; limpar: () => void; pergunta?: string };
}) {
  const [estado, executar, enviando] = useActionState<E, FormData>(acao, null as Awaited<E>);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const { confirmar: perguntar, notificar } = useInterface();
  const router = useRouter();

  // sucesso vira aviso no canto (o estado muda a cada envio)
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!estado?.ok) return;
    if (estado.criado && cadastrarOutro) {
      perguntar({
        titulo: estado.ok,
        mensagem: cadastrarOutro.pergunta ?? "Deseja cadastrar outro?",
        confirmar: "Sim",
        cancelar: "Não",
        sucesso: true,
      }).then((outro) => {
        if (outro) {
          cadastrarOutro.limpar();
          window.scrollTo({ top: 0 });
        } else {
          router.push(cadastrarOutro.lista);
        }
      });
      return;
    }
    notificar(estado.ok);
    if (limparAoEnviar) formRef.current?.reset();
    aoConcluir?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando chega um resultado novo
  }, [estado]);

  const erro = erroLocal ?? estado?.erro;
  if (estado?.ok && sucesso) return sucesso(estado);

  return (
    <form
      ref={formRef}
      noValidate
      className={className}
      onInput={(e) => {
        const alvo = e.target as HTMLElement;
        if (alvo.getAttribute("aria-invalid")) alvo.removeAttribute("aria-invalid");
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const invalidos = [...form.elements].filter(
          (el): el is HTMLInputElement => "validity" in el && !(el as HTMLInputElement).validity.valid,
        );
        if (invalidos.length) {
          invalidos.forEach((el) => el.setAttribute("aria-invalid", "true"));
          invalidos[0].focus();
          setErroLocal(mensagemDoCampo(invalidos[0]));
          return;
        }
        setErroLocal(null);
        if (confirmar && !(await perguntar(confirmar))) return;
        const dados = new FormData(form);
        startTransition(() => executar(dados));
      }}
    >
      <Enviando value={enviando}>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {children}
      </Enviando>
    </form>
  );
}

export function Aviso({ tipo, children }: { tipo: "erro" | "ok"; children: ReactNode }) {
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cn(
        "mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        tipo === "erro"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
      )}
    >
      {tipo === "erro" ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <CircleCheck className="mt-0.5 size-4 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

export function BotaoEnviar({ children, ...props }: ComponentProps<typeof Botao>) {
  const enviando = use(Enviando);
  return (
    <Botao type="submit" disabled={enviando || props.disabled} {...props}>
      {enviando && <LoaderCircle className="animate-spin" />}
      {children}
    </Botao>
  );
}
