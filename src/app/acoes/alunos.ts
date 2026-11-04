"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { buscarAluno, buscarInstituicao, contarAlunosAtivos, usuarioEmUso } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { DIAS_LONGOS, DURACOES, horaValida } from "@/lib/agenda";
import { lerDiaVencimento } from "@/lib/financeiro";
import { erroTelefone, mascaraTelefone } from "@/lib/mascaras";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";
import { cabeMaisUmAluno, limiteDeAlunos, textoLimiteAtingido } from "@/lib/planos";
import { notificarAlunos } from "@/lib/push";
import { normalizarUsuario } from "@/lib/usuario";

export async function salvarAluno(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const db = await getDb();
  if (id && !(await buscarAluno(professor.id, id))) return { erro: "Aluno não encontrado." };

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase() ?? null;
  const usuario = normalizarUsuario(String(dados.get("usuario") ?? "")) || null;
  const valorDigitado = texto(dados, "mensalidade");
  const mensalidade = lerValorEmCentavos(valorDigitado);

  if (!nome) return { erro: "Informe o nome do aluno." };
  // aluno novo entra ativo: respeita o limite do plano
  if (!id) {
    const erroLimite = await erroDoLimite(professor);
    if (erroLimite) return { erro: erroLimite };
  }
  if (valorDigitado && mensalidade == null) return { erro: "Valor da mensalidade inválido." };
  const erroFone = erroTelefone(texto(dados, "telefone"));
  if (erroFone) return { erro: erroFone };
  // o usuário é o login do aluno, então precisa ser único no site inteiro
  if (usuario && usuario.length < 3) return { erro: "O usuário precisa ter pelo menos 3 caracteres." };
  if (usuario && (await usuarioEmUso(usuario, id ?? undefined))) {
    return { erro: `O usuário “${usuario}” já está em uso. Tente outro, por exemplo “${usuario}${Math.floor(Math.random() * 90 + 10)}”.` };
  }

  const instituicaoId = Number(dados.get("instituicaoId")) || null;
  if (instituicaoId && !(await buscarInstituicao(professor.id, instituicaoId))) return { erro: "Instituição inválida." };

  // horários de aula: uma linha por dia (dia, hora, duração)
  const horas = dados.getAll("horarioHora").map(String);
  const duracoes = dados.getAll("horarioDuracao").map(Number);
  const horarios = dados
    .getAll("horarioDia")
    .map((dia, i) => ({ diaSemana: Number(dia), hora: horaValida(horas[i]) ? horas[i] : null, duracaoMin: DURACOES.includes(duracoes[i]) ? duracoes[i] : null }))
    .filter((h) => Number.isInteger(h.diaSemana) && h.diaSemana >= 0 && h.diaSemana <= 6)
    .slice(0, 14);

  const data = (campo: string) => {
    const valor = texto(dados, campo);
    return isoValido(valor) ? valor : null;
  };
  const valores = {
    nome,
    email,
    telefone: mascaraTelefone(texto(dados, "telefone")) || null,
    responsavel: texto(dados, "responsavel"),
    dataNascimento: data("dataNascimento"),
    instrumento: texto(dados, "instrumento"),
    nivel: texto(dados, "nivel"),
    // campos antigos, mantidos em dia com o primeiro horário
    diaAula: horarios[0] ? DIAS_LONGOS[horarios[0].diaSemana] : null,
    horario: horarios[0]?.hora ?? null,
    mensalidadeCentavos: mensalidade,
    diaVencimento: lerDiaVencimento(dados.get("diaVencimento")),
    dataInicio: data("dataInicio"),
    observacoes: texto(dados, "observacoes"),
    descricaoRecibo: texto(dados, "descricaoRecibo"),
    instituicaoId,
    usuario,
  };

  let alunoId = id;
  if (id) {
    await db
      .update(schema.alunos)
      .set(valores)
      .where(and(eq(schema.alunos.id, id), eq(schema.alunos.professorId, professor.id)));
  } else {
    const [novo] = await db
      .insert(schema.alunos)
      .values({ ...valores, professorId: professor.id })
      .returning({ id: schema.alunos.id });
    alunoId = novo.id;
  }
  // troca os horários de uma vez (o D1 executa o batch junto)
  await db.batch([
    db.delete(schema.horarios).where(eq(schema.horarios.alunoId, alunoId!)),
    ...(horarios.length ? [db.insert(schema.horarios).values(horarios.map((h) => ({ ...h, alunoId: alunoId! })))] : []),
  ]);
  revalidatePath("/", "layout");
  // aluno novo: o formulário pergunta se quer cadastrar outro; editando, volta para a página dele
  if (!id) return { ok: `Aluno “${nome}” cadastrado!`, criado: true };
  redirect(`/alunos/${alunoId}`);
}

/** Limite do plano atingido? Devolve a mensagem de erro (ou null se ainda cabe mais um aluno ativo). */
async function erroDoLimite(professor: { id: number; plano: string; master: boolean }) {
  const limite = limiteDeAlunos(professor);
  if (limite == null || cabeMaisUmAluno(professor, await contarAlunosAtivos(professor.id))) return null;
  return textoLimiteAtingido(professor, limite);
}

/** Ativa ou desativa o aluno. Reativar respeita o limite do plano. */
export async function alternarSituacao(id: number): Promise<{ erro?: string }> {
  const professor = await exigirProfessor();
  const db = await getDb();
  const aluno = await buscarAluno(professor.id, id);
  if (!aluno) return {};
  if (!aluno.ativo) {
    const erroLimite = await erroDoLimite(professor);
    if (erroLimite) return { erro: erroLimite };
  }
  await db.update(schema.alunos).set({ ativo: !aluno.ativo }).where(eq(schema.alunos.id, id));
  revalidatePath("/", "layout");
  return {};
}

export async function excluirAluno(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.alunos).where(and(eq(schema.alunos.id, id), eq(schema.alunos.professorId, professor.id)));
  revalidatePath("/", "layout");
  redirect("/alunos");
}

/** Mensagem do professor que aparece em destaque no acesso do aluno (vazia = remove). */
export async function salvarMensagemAluno(id: number, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const aluno = await buscarAluno(professor.id, id);
  if (!aluno) return { erro: "Aluno não encontrado." };
  const mensagem = texto(dados, "mensagem");
  if (mensagem && mensagem.length > 1000) return { erro: "A mensagem pode ter no máximo 1000 caracteres." };

  const db = await getDb();
  await db.update(schema.alunos).set({ mensagem }).where(eq(schema.alunos.id, id));
  // mensagem nova ou alterada: avisa no celular do aluno (se ele ativou as notificações)
  if (mensagem && mensagem !== aluno.mensagem) {
    await notificarAlunos([id], { title: `Mensagem de ${professor.nome.split(" ")[0]}`, body: mensagem.slice(0, 180), url: "/portal" });
  }
  revalidatePath(`/alunos/${id}`);
  return { ok: mensagem ? "Mensagem salva. O aluno já vê no acesso dele." : "Mensagem removida." };
}
