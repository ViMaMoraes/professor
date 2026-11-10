"use client";

import { CalendarClock, CalendarX2, RotateCcw } from "lucide-react";

import { agendarReposicao, concederReposicao, desmarcarAula } from "@/app/acoes/agenda";
import { JanelaFormulario } from "@/components/janela-formulario";
import { Campo, Input, Select } from "@/components/ui";
import { DURACOES } from "@/lib/agenda";

/** Desmarcar uma aula fixa (o professor não vai dar). A reposição já vem marcada. */
export function BotaoDesmarcar({ alunoId, nome, data, hora, quando }: { alunoId: number; nome: string; data: string; hora: string; quando: string }) {
  return (
    <JanelaFormulario
      rotulo={
        <>
          <CalendarX2 /> Desmarcar
        </>
      }
      variante="secundario"
      tamanho="sm"
      titulo="Desmarcar aula"
      subtitulo={`${nome} · ${quando}`}
      acao={desmarcarAula.bind(null, alunoId, data, hora)}
      enviar="Desmarcar aula"
    >
      <Campo rotulo="Motivo" dica="Opcional. O aluno vê na notificação.">
        <Input name="motivo" placeholder="Ex.: feriado, viagem" autoFocus />
      </Campo>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="reposicao" defaultChecked className="mt-0.5 size-4 accent-marca" />
        <span>
          Gerar reposição
          <span className="block text-xs text-suave">Desmarque se não vai repor esta aula.</span>
        </span>
      </label>
    </JanelaFormulario>
  );
}

/** Agendar (ou remarcar) uma reposição. */
export function BotaoAgendar({
  reposicaoId,
  nome,
  hoje,
  data,
  hora,
  duracaoMin,
  duracaoPadrao,
  remarcar = false,
}: {
  reposicaoId: number;
  nome: string;
  hoje: string;
  data?: string | null;
  hora?: string | null;
  duracaoMin?: number | null;
  duracaoPadrao: number;
  remarcar?: boolean;
}) {
  return (
    <JanelaFormulario
      rotulo={
        <>
          <CalendarClock /> {remarcar ? "Remarcar" : "Agendar"}
        </>
      }
      variante={remarcar ? "secundario" : "primario"}
      tamanho="sm"
      titulo={remarcar ? "Remarcar reposição" : "Agendar reposição"}
      subtitulo={`${nome} · o aluno recebe o aviso no celular`}
      acao={agendarReposicao.bind(null, reposicaoId)}
      enviar={remarcar ? "Remarcar" : "Agendar"}
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Dia *">
          <Input type="date" name="data" required min={hoje} defaultValue={data ?? ""} />
        </Campo>
        <Campo rotulo="Horário *">
          <Input type="time" name="hora" required defaultValue={hora ?? ""} />
        </Campo>
      </div>
      <Campo rotulo="Duração">
        <Select name="duracao" defaultValue={duracaoMin ?? ""}>
          <option value="">Padrão ({duracaoPadrao} min)</option>
          {DURACOES.map((d) => (
            <option key={d} value={d}>
              {d} min
            </option>
          ))}
        </Select>
      </Campo>
    </JanelaFormulario>
  );
}

/** Conceder uma reposição (exceção: ex.: o aluno faltou com atestado). */
export function BotaoConceder({
  alunoId,
  nome,
  motivo,
  rotulo = "Dar reposição",
  cursoId = null,
  cursos = [],
}: {
  alunoId: number;
  nome: string;
  motivo?: string;
  rotulo?: string;
  /** curso da aula de onde veio (estúdio) */
  cursoId?: number | null;
  /** cursos do aluno para escolher, quando não veio de uma aula e ele tem mais de um */
  cursos?: { id: number; rotulo: string }[];
}) {
  return (
    <JanelaFormulario
      rotulo={
        <>
          <RotateCcw /> {rotulo}
        </>
      }
      variante="secundario"
      tamanho="sm"
      titulo="Conceder reposição"
      subtitulo={`${nome} · por padrão, falta do aluno não tem reposição; aqui você abre uma exceção`}
      acao={concederReposicao.bind(null, alunoId, cursoId)}
      enviar="Conceder reposição"
    >
      {!cursoId && cursos.length > 1 && (
        <Campo rotulo="Curso">
          <Select name="cursoId" required defaultValue="">
            <option value="" disabled>
              Escolha o curso
            </option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </Select>
        </Campo>
      )}
      <Campo rotulo="Motivo" dica="Fica registrado na reposição.">
        <Input name="motivo" defaultValue={motivo} placeholder="Ex.: falta com atestado médico" autoFocus />
      </Campo>
    </JanelaFormulario>
  );
}
