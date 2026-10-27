import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_SESSAO, lerToken } from "@/lib/sessao";

const AREA_PROFESSOR = ["/painel", "/alunos", "/chamada", "/recibos", "/materiais", "/configuracoes"];

/**
 * Checagem otimista: só encaminha para o lugar certo pelo cookie.
 * A autorização de verdade acontece em cada página, action e rota (lib/auth.ts).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessao = await lerToken(request.cookies.get(COOKIE_SESSAO)?.value);
  const ir = (destino: string) => NextResponse.redirect(new URL(destino, request.url));

  if (pathname === "/") {
    if (!sessao) return ir("/login");
    return ir(sessao.tipo === "professor" ? "/painel" : "/portal");
  }
  const areaProfessor = AREA_PROFESSOR.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if ((areaProfessor || pathname.startsWith("/portal")) && !sessao) return ir("/login");
  if (areaProfessor && sessao?.tipo === "aluno") return ir("/portal");
  if (pathname.startsWith("/portal") && sessao?.tipo === "professor") return ir("/painel");
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
