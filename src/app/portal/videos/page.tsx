import { Clapperboard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CapaVideo } from "@/components/capa-video";
import { Card, Vazio } from "@/components/ui";
import { exigirAlunoComProfessor } from "@/lib/auth";
import { videosDoAluno } from "@/lib/consultas";
import { dataBR } from "@/lib/formato";
import { agruparPorModulo, urlCapa } from "@/lib/video";

export const metadata: Metadata = { title: "Vídeos" };

export default async function PaginaVideosAluno() {
  const { aluno } = await exigirAlunoComProfessor();
  const { videos, modulos } = await videosDoAluno(aluno);
  const grupos = agruparPorModulo(videos, modulos);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Vídeos</h1>
        <p className="mt-1 text-sm text-suave">Assista aqui mesmo, na ordem dos módulos.</p>
      </div>
      {grupos.length === 0 ? (
        <Card>
          <Vazio icone={<Clapperboard />} titulo="Nenhum vídeo ainda">
            Quando o professor liberar vídeos, eles aparecem aqui.
          </Vazio>
        </Card>
      ) : (
        <div className="space-y-8">
          {grupos.map(({ modulo, videos: doModulo }) => {
            const vistos = doModulo.filter((v) => v.visto).length;
            return (
              <section key={modulo?.id ?? "outros"}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{modulo?.nome ?? "Outros vídeos"}</h2>
                    {modulo?.descricao && <p className="text-sm text-suave">{modulo.descricao}</p>}
                  </div>
                  <span className="text-xs text-suave">
                    {vistos} de {doModulo.length} assistidos
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {doModulo.map((v) => (
                    <Link key={v.id} href={`/portal/videos/${v.id}`} className="group min-w-0">
                      <CapaVideo src={urlCapa(v)} visto={v.visto} className="transition-transform group-hover:scale-[1.02]" />
                      <p className="mt-2 line-clamp-2 text-sm font-medium group-hover:text-marca-texto">{v.titulo}</p>
                      <p className="text-xs text-suave">{dataBR(v.criadoEm)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
