"use client";

import { Bell, BellOff, LoaderCircle, Share } from "lucide-react";
import { useEffect, useState } from "react";

import { useInterface } from "./interface";
import { Botao } from "./ui";

type Estado = "carregando" | "sem-suporte" | "instalar-ios" | "bloqueado" | "desativado" | "ativado";

function chaveParaBytes(base64url: string) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);

/** Liga/desliga as notificações de avisos e materiais novos neste aparelho. */
export function AtivarNotificacoes({
  chavePublica,
  titulo = "Receba avisos e materiais novos no celular",
  motivo = "quando o professor mandar um aviso ou liberar material",
}: {
  chavePublica: string;
  /** Chamada do cartão enquanto as notificações estão desligadas. */
  titulo?: string;
  /** Completa "Você será avisado ..." / "Ative para ser avisado ...". */
  motivo?: string;
}) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);
  const { notificar } = useInterface();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // no iPhone/iPad as notificações só existem com o app instalado na tela de início
        setEstado(ehIOS() && !instalado() ? "instalar-ios" : "sem-suporte");
        return;
      }
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const registro = await navigator.serviceWorker.getRegistration();
      const inscricao = await registro?.pushManager.getSubscription();
      setEstado(inscricao ? "ativado" : "desativado");
    })().catch(() => setEstado("sem-suporte"));
  }, []);

  async function ativar() {
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desativado");
        return;
      }
      const registro = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const inscricao =
        (await registro.pushManager.getSubscription()) ??
        (await Promise.race([
          registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chavePublica) }),
          // sem internet (ou servidor de push fora do ar) o navegador pode ficar esperando para sempre
          new Promise<never>((_, falhar) => setTimeout(() => falhar(new Error("tempo")), 20000)),
        ]));
      const resposta = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inscricao.toJSON()),
      });
      if (!resposta.ok) throw new Error();
      setEstado("ativado");
      notificar("Notificações ativadas neste aparelho.");
    } catch {
      notificar("Não foi possível ativar as notificações. Tente de novo.", "erro");
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    try {
      const registro = await navigator.serviceWorker.getRegistration();
      const inscricao = await registro?.pushManager.getSubscription();
      if (inscricao) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: inscricao.endpoint }),
        });
        await inscricao.unsubscribe();
      }
      setEstado("desativado");
      notificar("Notificações desativadas neste aparelho.", "info");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "carregando" || estado === "sem-suporte") return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-3">
        <span className="rounded-xl bg-marca-suave p-2.5 text-marca-texto">
          {estado === "ativado" ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <div className="text-sm">
          <p className="font-medium">
            {estado === "ativado" ? "Notificações ativadas neste aparelho" : titulo}
          </p>
          <p className="text-suave">
            {estado === "instalar-ios" ? (
              <>
                No iPhone, primeiro instale o app: toque em <Share className="inline size-3.5" /> Compartilhar e depois em
                “Adicionar à Tela de Início”. Abra pelo ícone e ative aqui.
              </>
            ) : estado === "bloqueado" ? (
              "As notificações estão bloqueadas para este site. Libere nas configurações do navegador."
            ) : estado === "ativado" ? (
              `Você será avisado ${motivo}.`
            ) : (
              `Ative para ser avisado ${motivo}.`
            )}
          </p>
        </div>
      </div>
      {estado === "desativado" && (
        <Botao onClick={ativar} disabled={ocupado} className="shrink-0">
          {ocupado ? <LoaderCircle className="animate-spin" /> : <Bell />} Ativar
        </Botao>
      )}
      {estado === "ativado" && (
        <Botao variante="secundario" onClick={desativar} disabled={ocupado} className="shrink-0">
          {ocupado ? <LoaderCircle className="animate-spin" /> : <BellOff />} Desativar
        </Botao>
      )}
    </div>
  );
}
