import { acessoDe, professorPodeVer, usuarioAtual } from "@/lib/auth";
import { filtroDeAlunos } from "@/lib/permissoes";
import { buscarInstituicao, historicoPresencas } from "@/lib/consultas";
import { hojeISO, isoValido } from "@/lib/formato";
import { gerarPlanilhaChamada } from "@/lib/planilha-chamada";

/** Exporta a chamada do período em Excel (.xlsx): ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD, opcionalmente &aluno=ID ou &instituicao=ID. */
export async function GET(request: Request) {
  const usuario = await usuarioAtual();
  if (usuario?.tipo !== "professor") return new Response("Não autorizado", { status: 401 });
  if (!professorPodeVer(usuario, "chamada")) return new Response("Sem permissão", { status: 403 });

  const params = new URL(request.url).searchParams;
  const hoje = hojeISO();
  const inicio = isoValido(params.get("inicio")) ? params.get("inicio")! : hoje.slice(0, 8) + "01";
  const fim = isoValido(params.get("fim")) ? params.get("fim")! : hoje;
  const alunoId = Number(params.get("aluno")) || undefined;
  const instituicaoId = Number(params.get("instituicao")) || undefined;
  const instituicao = instituicaoId ? await buscarInstituicao(usuario.professor.id, instituicaoId) : undefined;

  // quem da equipe só vê os próprios alunos exporta só a chamada deles
  const conta = { id: usuario.professor.id, escopoMembro: filtroDeAlunos(acessoDe(usuario)) };
  const linhas = await historicoPresencas(conta, inicio, fim, alunoId, instituicao?.id);
  // estúdio: cada curso do aluno vira uma linha própria na planilha, "Ana Souza (Piano)" (id negativo do curso
  // só para separar as linhas; os ids de curso e de aluno nunca se misturam)
  const registros = linhas.map(({ presenca, aluno, curso }) => ({
    ...presenca,
    aluno: curso ? { id: -presenca.cursoId, nome: `${aluno.nome} (${curso})`, instrumento: curso } : aluno,
  }));
  const arquivo = await gerarPlanilhaChamada(registros, { inicio, fim }, instituicao?.nome);

  const quem = alunoId && registros[0] ? ` ${registros[0].aluno.nome}` : instituicao ? ` ${instituicao.nome}` : "";
  const nome = `chamada${quem} ${inicio} a ${fim}`.replace(/[\\/:*?"<>|]/g, "_");
  return new Response(Buffer.from(arquivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nome)}.xlsx`,
      "Cache-Control": "private, no-store",
    },
  });
}
