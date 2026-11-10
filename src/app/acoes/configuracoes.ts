"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { exigirDono } from "@/lib/auth";
import { codigoEmUso, emailEmUso } from "@/lib/consultas";
import { planoPermiteEquipe } from "@/lib/planos";
import { erroCodigo, normalizarCodigo } from "@/lib/usuario";
import { getDb, schema } from "@/lib/db";
import { DURACOES, LEMBRETES } from "@/lib/agenda";
import { DIA_VENCIMENTO_PADRAO, lerDiaVencimento } from "@/lib/financeiro";
import { erroDocumento, erroTelefone, mascaraDocumento, mascaraRg, mascaraTelefone } from "@/lib/mascaras";
import { texto, type EstadoForm } from "@/lib/estado-form";

export async function salvarConfiguracoes(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirDono();
  const db = await getDb();

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase();
  const novaSenha = String(dados.get("novaSenha") ?? "");
  if (!nome || !email) return { erro: "Nome e e-mail são obrigatórios." };

  if (await emailEmUso(email, { professorId: professor.id })) return { erro: "Esse e-mail já está em uso." };

  const codigo = normalizarCodigo(String(dados.get("codigo") ?? ""));
  const erroDoCodigo = erroCodigo(codigo);
  if (erroDoCodigo) return { erro: erroDoCodigo };
  if (await codigoEmUso(codigo, professor.id)) return { erro: `O código “${codigo}” já é de outro professor. Escolha outro.` };

  if (novaSenha) {
    if (novaSenha.length < 6) return { erro: "A nova senha precisa ter pelo menos 6 caracteres." };
    if (!(await bcrypt.compare(String(dados.get("senhaAtual") ?? ""), professor.senhaHash))) {
      return { erro: "Para trocar a senha, informe a senha atual corretamente." };
    }
  }

  // CPF/CNPJ, RG e telefone saem formatados no recibo
  const erroDados = erroDocumento(texto(dados, "documento"), "CPF/CNPJ") ?? erroTelefone(texto(dados, "telefone"));
  if (erroDados) return { erro: erroDados };

  // assinatura: PNG desenhado/enviado na tela (data URL); limite para não pesar o banco
  const novaAssinatura = texto(dados, "assinatura");
  if (novaAssinatura && (!novaAssinatura.startsWith("data:image/png;base64,") || novaAssinatura.length > 400_000)) {
    return { erro: "Assinatura inválida ou muito grande. Tente desenhar de novo ou enviar uma imagem menor." };
  }
  const assinatura = novaAssinatura ? { assinatura: novaAssinatura } : dados.get("remover_assinatura") ? { assinatura: null } : {};

  await db
    .update(schema.professores)
    .set({
      nome,
      email,
      codigo,
      // estúdio só no plano que permite equipe
      tipoConta: dados.get("tipoConta") === "estudio" && planoPermiteEquipe(professor) ? "estudio" : "autonomo",
      nomeEstudio: dados.get("tipoConta") === "estudio" ? (texto(dados, "nomeEstudio")?.slice(0, 80) ?? null) : professor.nomeEstudio,
      documento: mascaraDocumento(texto(dados, "documento")) || null,
      telefone: mascaraTelefone(texto(dados, "telefone")) || null,
      endereco: texto(dados, "endereco"),
      cidade: texto(dados, "cidade"),
      rg: mascaraRg(texto(dados, "rg")) || null,
      diaVencimento: lerDiaVencimento(dados.get("diaVencimento")) ?? DIA_VENCIMENTO_PADRAO,
      chavePix: texto(dados, "chavePix"),
      duracaoAula: DURACOES.includes(Number(dados.get("duracaoAula"))) ? Number(dados.get("duracaoAula")) : 60,
      lembreteMinutos: LEMBRETES.some(([m]) => m === Number(dados.get("lembreteMinutos"))) ? Number(dados.get("lembreteMinutos")) : 120,
      ...assinatura,
      ...(novaSenha ? { senhaHash: await bcrypt.hash(novaSenha, 10) } : {}),
    })
    .where(eq(schema.professores.id, professor.id));
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas." };
}
