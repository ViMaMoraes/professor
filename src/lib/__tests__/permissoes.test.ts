import { describe, expect, it } from "vitest";

import { ACESSO_DONO, acessoDoMembro, CARGOS, destinoLiberado, filtroDeAlunos, gravarModulos, lerModulos, moduloDoCaminho, podeVer } from "../permissoes";

describe("permissões da equipe", () => {
  it("o dono vê tudo e todos os alunos", () => {
    const dono = ACESSO_DONO("Marcus");
    expect(podeVer(dono, "financeiro")).toBe(true);
    expect(filtroDeAlunos(dono)).toBeNull();
  });

  it("professor da equipe vê só os módulos liberados e só os próprios alunos", () => {
    const prof = acessoDoMembro({ id: 7, nome: "Ana", modulos: gravarModulos(CARGOS.professor.modulos), todosAlunos: false });
    expect(podeVer(prof, "chamada")).toBe(true);
    expect(podeVer(prof, "financeiro")).toBe(false);
    expect(podeVer(prof, "recibos")).toBe(false);
    expect(filtroDeAlunos(prof)).toBe(7);
  });

  it("coordenação vê todos os módulos e todos os alunos", () => {
    const coord = acessoDoMembro({ id: 8, nome: "Bia", modulos: gravarModulos(CARGOS.coordenacao.modulos), todosAlunos: true });
    expect(podeVer(coord, "financeiro")).toBe(true);
    expect(filtroDeAlunos(coord)).toBeNull();
  });

  it("módulos gravados como texto, sem repetidos nem desconhecidos, na ordem do menu", () => {
    expect(lerModulos("agenda, alunos,agenda,senhas,")).toEqual(["agenda", "alunos"]);
    expect(gravarModulos(["videos", "alunos"])).toBe("alunos,videos");
    expect(lerModulos(null)).toEqual([]);
  });

  it("cada endereço do menu tem o seu módulo", () => {
    expect(moduloDoCaminho("/financeiro")).toBe("financeiro");
    expect(moduloDoCaminho("/alunos/3/editar")).toBe("alunos");
    expect(moduloDoCaminho("/configuracoes")).toBe("dono");
    expect(moduloDoCaminho("/equipe/novo")).toBe("dono");
    expect(moduloDoCaminho("/painel")).toBeNull();
    expect(moduloDoCaminho("/folha-recibo/2")).toBe("recibos");
  });
});

describe("para quem fica liberado (equipe que só vê os próprios alunos)", () => {
  it("quem vê todos escolhe livremente", () => {
    expect(destinoLiberado({ restrito: false, querTodos: true, escolhidos: [], meus: [] })).toEqual({ paraTodos: true, alunoIds: [] });
    expect(destinoLiberado({ restrito: false, querTodos: false, escolhidos: [3], meus: [] })).toEqual({ paraTodos: false, alunoIds: [3] });
  });

  it("'todos' vira todos os alunos dele", () => {
    expect(destinoLiberado({ restrito: true, querTodos: true, escolhidos: [], meus: [1, 2] })).toEqual({ paraTodos: false, alunoIds: [1, 2] });
  });

  it("não tira o acesso de quem já tinha: o que era para todos continua, e os alunos de outros ficam", () => {
    expect(destinoLiberado({ restrito: true, querTodos: false, escolhidos: [1], meus: [1, 2], eraParaTodos: true })).toEqual({ paraTodos: true, alunoIds: [] });
    expect(destinoLiberado({ restrito: true, querTodos: false, escolhidos: [2], meus: [1, 2], vinculosAtuais: [1, 9] })).toEqual({ paraTodos: false, alunoIds: [2, 9] });
  });

  it("não aceita aluno de outro professor escolhido por ele", () => {
    expect(destinoLiberado({ restrito: true, querTodos: false, escolhidos: [1, 9], meus: [1] })).toEqual({ paraTodos: false, alunoIds: [1] });
  });
});
