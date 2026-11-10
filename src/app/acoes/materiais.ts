"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { buscarMaterial, listarAlunos } from "@/lib/consultas";
import { destinoLiberado } from "@/lib/permissoes";
import { getDb, schema } from "@/lib/db";
import { lerLinkDrive } from "@/lib/drive";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { notificarAlunos } from "@/lib/push";

export async function salvarMaterial(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor("materiais");
  const db = await getDb();
  const atual = id ? await buscarMaterial(professor.id, id) : null;
  if (id && !atual) return { erro: "Material não encontrado." };

  const titulo = texto(dados, "titulo");
  const drive = lerLinkDrive(texto(dados, "link"));
  const querTodos = dados.get("destino") === "todos";
  // só aceita alunos deste professor (ou, na equipe que só vê os próprios alunos, os dele)
  const todosAlunos = await listarAlunos(professor, { situacao: "todos" });
  const meus = new Set(todosAlunos.map((a) => a.id));
  const escolhidos = [...new Set(dados.getAll("alunos").map(Number))].filter((alunoId) => meus.has(alunoId));
  const vinculosAtuais = id
    ? (await db.select({ alunoId: schema.materiaisAlunos.alunoId }).from(schema.materiaisAlunos).where(eq(schema.materiaisAlunos.materialId, id))).map((v) => v.alunoId)
    : [];
  const { paraTodos, alunoIds } = destinoLiberado({
    restrito: professor.escopoMembro != null,
    querTodos,
    escolhidos,
    meus: [...meus],
    eraParaTodos: atual?.paraTodos,
    vinculosAtuais,
  });

  if (!drive) return { erro: "Cole o link de compartilhamento de um arquivo, pasta ou documento do Google Drive." };
  if (!titulo) return { erro: "Informe um título para o material." };
  if (!paraTodos && alunoIds.length === 0) return { erro: "Escolha pelo menos um aluno ou marque “Todos os alunos”." };

  const valores = {
    titulo,
    descricao: texto(dados, "descricao"),
    categoria: texto(dados, "categoria"),
    paraTodos,
    link: drive.link,
    tipoDrive: drive.tipo,
    driveId: drive.id,
  };

  let materialId = id;
  if (!materialId) {
    const [novo] = await db
      .insert(schema.materiais)
      .values({ ...valores, professorId: professor.id })
      .returning({ id: schema.materiais.id });
    materialId = novo.id;
  }
  // atualiza o material e troca a lista de alunos de uma vez (o D1 não tem transações, mas executa o batch junto)
  const vinculos = paraTodos ? [] : alunoIds.map((alunoId) => ({ materialId: materialId!, alunoId }));
  await db.batch([
    db
      .update(schema.materiais)
      .set(valores)
      .where(and(eq(schema.materiais.id, materialId), eq(schema.materiais.professorId, professor.id))),
    db.delete(schema.materiaisAlunos).where(eq(schema.materiaisAlunos.materialId, materialId)),
    ...(vinculos.length ? [db.insert(schema.materiaisAlunos).values(vinculos)] : []),
  ]);

  // material novo: avisa no celular quem tem acesso (só quem ativou as notificações recebe)
  if (!id) {
    const destino = paraTodos ? todosAlunos.filter((a) => a.ativo).map((a) => a.id) : alunoIds.filter((a) => meus.has(a));
    await notificarAlunos(destino, { title: "Novo material", body: titulo, url: "/portal" });
  }

  revalidatePath("/", "layout");
  // material novo: o formulário pergunta se quer adicionar outro
  if (!id) return { ok: `Material “${titulo}” publicado!`, criado: true };
  redirect("/materiais");
}

export async function excluirMaterial(id: number) {
  const professor = await exigirProfessor("materiais");
  const db = await getDb();
  await db.delete(schema.materiais).where(and(eq(schema.materiais.id, id), eq(schema.materiais.professorId, professor.id)));
  revalidatePath("/", "layout");
}
