"use client";

import { useEffect } from "react";

/** Registra o service worker para o site poder ser instalado como app (PWA) e receber notificações. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }
  }, []);
  return null;
}
