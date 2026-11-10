"use server";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAcesso, exigirProfessor } from "@/lib/auth";
import { podeVer, type Acesso } from "@/lib/permissoes";
import {
  alunoComUsuario,
  buscarAluno,
  buscarInstituicao,
  contarAlunosAtivos,
  cursosDaConta,
  listarMembros,
  usuarioLivre,
} from "@/lib/consultas";
import { lerCursosDoFormulario, resumoDosCursos } from "@/lib/cursos";
import { getDb, schema } from "@/lib/db";
import { DIAS_LONGOS, DURACOES, horaValida } from "@/lib/agenda";
import { lerDiaVencimento } from "@/lib/financeiro";
import { erroTelefone, mascaraTelefone } from "@/lib/mascaras";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";
import { cabeMaisUmAluno, ehEstudio, limiteDeAlunos, textoLimiteAtingido } from "@/lib/planos";
import { notificarAlunos } from "@/lib/push";
import { normalizarUsuario } from "@/lib/usuario";

export async function salvarAluno(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const { professor, acesso } = await exigirAcesso("alunos");
  const estudio = ehEstudio(professor);
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

  // estúdio: cursos (cada um com professor e horários); fora dele, um curso escrito e os horários
  const doEstudio = estudio ? lerCursosDoFormulario(dados) : null;
  if (doEstudio?.cursos.some((c) => !c.nome)) return { erro: "Informe o nome de cada curso." };

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
    // estúdio: atualizado depois, com os nomes de todos os cursos do aluno
    instrumento: estudio ? (existente?.instrumento ?? null) : texto(dados, "instrumento"),
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
  if (doEstudio) {
    await salvarCursos(professor.id, alunoId!, acesso, doEstudio, Boolean(id));
  } else {
    // troca os horários de uma vez (o D1 executa o batch junto)
    await db.batch([
      db.delete(schema.horarios).where(eq(schema.horarios.alunoId, alunoId!)),
      ...(horarios.length ? [db.insert(schema.horarios).values(horarios.map((h) => ({ ...h, alunoId: alunoId! })))] : []),
    ]);
  }
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

/**
 * Grava os cursos do aluno no estúdio e os horários de cada um. Quem atribui (dono ou quem vê todos os alunos)
 * muda todos os cursos; o professor da equipe só os dele (os novos ficam com ele). Depois, o campo de curso do
 * aluno vira a lista dos cursos e a equipe do aluno (quem o vê) passa a ser a dos professores dos cursos.
 */
async function salvarCursos(
  professorId: number,
  alunoId: number,
  acesso: Acesso,
  enviados: ReturnType<typeof lerCursosDoFormulario>,
  jaExistia: boolean,
) {
  const db = await getDb();
  const { cursosAluno, horarios, alunoEquipe, alunos } = schema;
  const atribui = acesso.dono || acesso.todosAlunos;
  const eu = acesso.dono ? null : acesso.membroId;
  const daConta = new Set((await listarMembros(professorId)).map((m) => m.id));
  const existentes = jaExistia ? await cursosDaConta(professorId, { alunoId }) : [];
  // o que esta pessoa pode mudar
  const editaveis = atribui ? existentes : existentes.filter((c) => c.membroId === eu);
  const idDe = new Map<string, number>();
  for (const c of enviados.cursos) {
    const membroId = atribui ? (c.membroId && daConta.has(c.membroId) ? c.membroId : null) : eu;
    const atual = c.id ? editaveis.find((e) => e.id === c.id) : undefined;
    if (atual) {
      await db.update(cursosAluno).set({ nome: c.nome, membroId }).where(eq(cursosAluno.id, atual.id));
      idDe.set(c.chave, atual.id);
    } else {
      const [novo] = await db.insert(cursosAluno).values({ alunoId, nome: c.nome, membroId }).returning({ id: cursosAluno.id });
      idDe.set(c.chave, novo.id);
    }
  }
  const mantidos = new Set(idDe.values());
  const removidos = editaveis.filter((c) => !mantidos.has(c.id)).map((c) => c.id);
  // horários: os dos cursos que esta pessoa cuida (e os antigos, sem curso, que viram curso agora)
  const trocar = [...new Set([...editaveis.map((c) => c.id), ...mantidos])];
  const novosHorarios = enviados.horarios
    .filter((h) => idDe.has(h.cursoChave))
    .map(({ cursoChave, ...h }) => ({ ...h, alunoId, cursoId: idDe.get(cursoChave)! }));
  await db.batch([
    db.delete(horarios).where(
      and(
        eq(horarios.alunoId, alunoId),
        // horários antigos (sem curso) viram curso: quem atribui sempre; o professor da equipe só se o aluno não tinha curso
        atribui || existentes.length === 0
          ? or(isNull(horarios.cursoId), inArray(horarios.cursoId, trocar.length ? trocar : [0]))
          : inArray(horarios.cursoId, trocar.length ? trocar : [0]),
      ),
    ),
    ...(removidos.length ? [db.delete(cursosAluno).where(inArray(cursosAluno.id, removidos))] : []),
    ...(novosHorarios.length ? [db.insert(horarios).values(novosHorarios)] : []),
  ]);
  // resumo no aluno e quem da equipe o vê
  const todos = await cursosDaConta(professorId, { alunoId });
  const equipe = [...new Set(todos.map((c) => c.membroId).filter((m): m is number => m != null))];
  const primeiro = (await db.select().from(horarios).where(eq(horarios.alunoId, alunoId)).limit(1))[0];
  await db.batch([
    db
      .update(alunos)
      .set({
        instrumento: resumoDosCursos(todos.map((c) => c.nome)),
        diaAula: primeiro ? DIAS_LONGOS[primeiro.diaSemana] : null,
        horario: primeiro?.hora ?? null,
      })
      .where(eq(alunos.id, alunoId)),
    db.delete(alunoEquipe).where(eq(alunoEquipe.alunoId, alunoId)),
    ...(equipe.length ? [db.insert(alunoEquipe).values(equipe.map((membroId) => ({ alunoId, membroId })))] : []),
  ]);
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
