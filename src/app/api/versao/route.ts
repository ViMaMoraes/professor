import { VERSAO_APP } from "@/lib/versao";

/** Versão que está no ar: o navegador compara com a dele para avisar que há atualização. */
export function GET() {
  return Response.json({ versao: VERSAO_APP }, { headers: { "Cache-Control": "no-store" } });
}
