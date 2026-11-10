"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAcesso, exigirProfessor } from "@/lib/auth";
import { podeVer } from "@/lib/permissoes";
import { alunoComUsuario, buscarAluno, buscarInstituicao, contarAlunosAtivos, listarMembros, usuarioLivre } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { DIAS_LONGOS, DURACOES, horaValida } from "@/lib/agenda";
import { lerDiaVencimento } from "@/lib/financeiro";
import { erroTelefone, mascaraTelefone } from "@/lib/mascaras";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";
import { cabeMaisUmAluno, limiteDeAlunos, textoLimiteAtingido } from "@/lib/planos";
import { notificarAlunos } from "@/lib/push";
import { normalizarUsuario } from "@/lib/usuario";
import { ehEstudio } from "@/lib/planos";

export async function salvarAluno(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const { professor, acesso } = await exigirAcesso("alunos");
  // a equipe sem o Financeiro não vê nem muda valores: ficam os que já estavam
  const verValores = podeVer(acesso, "financeiro");
  const db = await getDb();
  const existente = id ? await buscarAluno(professor, id) : null;
  if (id && !existente) return { erro: "Aluno não encontrado." };

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase() ?? null;
  const usuario = normalizarUsuario(String(dados.get("usuario") ?? "")) || null;
  const valorDigitado = verValores ? texto(dados, "mensalidade") : null;
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
  // o usuário é o login do aluno: precisa ser único entre os alunos deste professor
  if (usuario && usuario.length < 3) return { erro: "O usuário precisa ter pelo menos 3 caracteres." };
  const conflito = usuario ? await alunoComUsuario(professor.id, usuario, id ?? undefined) : null;
  if (usuario && conflito)
    return { erro: textoUsuarioRepetido(usuario, conflito, await usuarioLivre(professor.id, usuario, id ?? undefined)) };

  const instituicaoId = Number(dados.get("instituicaoId")) || null;
  if (instituicaoId && !(await buscarInstituicao(professor.id, instituicaoId))) return { erro: "Instituição inválida." };

  // horários de aula: uma linha por dia (dia, hora, duração)
  const horas = dados.getAll("horarioHora").map(String);
  const duracoes = dados.getAll("horarioDuracao").map(Number);
  const horarios = dados
    .getAll("horarioDia")
    .map((dia, i) => ({
      diaSemana: Number(dia),
      hora: horaValida(horas[i]) ? horas[i] : null,
      duracaoMin: DURACOES.includes(duracoes[i]) ? duracoes[i] : null,
    }))
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
    mensalidadeCentavos: verValores ? mensalidade : (existente?.mensalidadeCentavos ?? null),
    diaVencimento: verValores ? lerDiaVencimento(dados.get("diaVencimento")) : (existente?.diaVencimento ?? null),
    dataInicio: data("dataInicio"),
    observacoes: texto(dados, "observacoes"),
    descricaoRecibo: verValores ? texto(dados, "descricaoRecibo") : (existente?.descricaoRecibo ?? null),
    instituicaoId,
    usuario,
    // usuário antigo (único no site) só continua valendo sem código enquanto não for trocado
    usuarioGlobal: Boolean(existente?.usuarioGlobal && usuario && usuario === existente.usuario),
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
  // professores da equipe (estúdio): quem atribui (dono ou quem vê todos) escolhe; quem só vê os
  // próprios alunos fica como professor do aluno que cadastrar e não muda os de quem já existe
  let professoresDoAluno: number[] | null = null;
  if (ehEstudio(professor)) {
    if (acesso.dono || acesso.todosAlunos) {
      const daConta = new Set((await listarMembros(professor.id)).map((m) => m.id));
      professoresDoAluno = [...new Set(dados.getAll("equipe").map(Number))].filter((m) => daConta.has(m));
    } else if (!id) {
      professoresDoAluno = [acesso.membroId];
    }
  }
  // troca os horários (e os professores) de uma vez (o D1 executa o batch junto)
  await db.batch([
    db.delete(schema.horarios).where(eq(schema.horarios.alunoId, alunoId!)),
    ...(horarios.length ? [db.insert(schema.horarios).values(horarios.map((h) => ({ ...h, alunoId: alunoId! })))] : []),
    ...(professoresDoAluno
      ? [
          db.delete(schema.alunoEquipe).where(eq(schema.alunoEquipe.alunoId, alunoId!)),
          ...(professoresDoAluno.length
            ? [db.insert(schema.alunoEquipe).values(professoresDoAluno.map((membroId) => ({ alunoId: alunoId!, membroId })))]
            : []),
        ]
      : []),
  ]);
  revalidatePath("/", "layout");
  // aluno novo: o formulário pergunta se quer cadastrar outro; editando, volta para a página dele
  if (!id) {
    // preencheu a última vaga do plano: avisa já, em vez de perguntar "cadastrar outro?"
    const limite = limiteDeAlunos(professor);
    if (limite != null && !cabeMaisUmAluno(professor, await contarAlunosAtivos(professor.id))) {
      return { ok: `Aluno “${nome}” cadastrado! Você chegou ao limite de ${limite} alunos ativos do seu plano.` };
    }
    return { ok: `Aluno “${nome}” cadastrado!`, criado: true };
  }
  redirect(`/alunos/${alunoId}`);
}

const textoUsuarioRepetido = (usuario: string, aluno: { nome: string; ativo: boolean }, livre: string) =>
  `O usuário “${usuario}” já é do seu aluno ${aluno.nome}${aluno.ativo ? "" : " (inativo)"}. Use outro, por exemplo “${livre}”.`;

/**
 * Confere o usuário enquanto o professor digita: livre ou de qual aluno dele já é, com uma sugestão livre.
 * Só olha os alunos do próprio professor (de outros professores pode repetir).
 */
export async function conferirUsuario(
  texto: string,
  alunoId: number | null,
): Promise<{ livre: boolean; mensagem?: string; sugestao?: string }> {
  const professor = await exigirProfessor("alunos");
  const usuario = normalizarUsuario(texto);
  if (usuario.length < 3) return { livre: false };
  const conflito = await alunoComUsuario(professor.id, usuario, alunoId ?? undefined);
  if (!conflito) return { livre: true };
  const sugestao = await usuarioLivre(professor.id, usuario, alunoId ?? undefined);
  return { livre: false, mensagem: textoUsuarioRepetido(usuario, conflito, sugestao), sugestao };
}

/** Limite do plano atingido? Devolve a mensagem de erro (ou null se ainda cabe mais um aluno ativo). */
async function erroDoLimite(professor: { id: number; plano: string; master: boolean }) {
  const limite = limiteDeAlunos(professor);
  if (limite == null || cabeMaisUmAluno(professor, await contarAlunosAtivos(professor.id))) return null;
  return textoLimiteAtingido(professor, limite);
}

/** Ativa ou desativa o aluno. Reativar respeita o limite do plano. */
export async function alternarSituacao(id: number): Promise<{ erro?: string }> {
  const professor = await exigirProfessor("alunos");
  const db = await getDb();
  const aluno = await buscarAluno(professor, id);
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
  const professor = await exigirProfessor("alunos");
  const db = await getDb();
  await db.delete(schema.alunos).where(and(eq(schema.alunos.id, id), eq(schema.alunos.professorId, professor.id)));
  revalidatePath("/", "layout");
  redirect("/alunos");
}

/** Mensagem do professor que aparece em destaque no acesso do aluno (vazia = remove). */
export async function salvarMensagemAluno(id: number, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor("alunos");
  const aluno = await buscarAluno(professor, id);
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
