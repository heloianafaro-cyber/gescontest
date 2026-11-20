import type { ReactNode } from "react";
import type { InscritoConferencia } from "@/modules/eventos/conferencia-db";
import { ROTULO_STATUS } from "@/modules/eventos/impugnacao";

const formatarData = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" });

function Situacao({ i }: { i: InscritoConferencia }) {
  const s = i.impugnacao;
  if (!s) return <span className="text-muted-foreground">Regular</span>;
  return (
    <div className="space-y-1">
      <p className="font-medium">
        {ROTULO_STATUS[s.status]}
        {s.bloqueio ? " — bloqueio" : ""}
      </p>
      <p className="whitespace-pre-wrap">Motivo: {s.motivo}</p>
      {s.recursoTexto && (
        <p className="whitespace-pre-wrap">
          Recurso{s.recursoEm ? ` (${formatarData(s.recursoEm)})` : ""}: {s.recursoTexto}
        </p>
      )}
      {s.nomeArquivo && <p>Anexo: {s.nomeArquivo}</p>}
      {s.decisaoTexto && !s.bloqueio && (
        <p className="whitespace-pre-wrap">
          Decisão{s.decididoEm ? ` (${formatarData(s.decididoEm)})` : ""}: {s.decisaoTexto}
        </p>
      )}
    </div>
  );
}

export function ListaConferencia({
  inscritos,
  mostrarDelegacao,
  acoes,
}: {
  inscritos: InscritoConferencia[];
  mostrarDelegacao: boolean;
  acoes?: (i: InscritoConferencia) => ReactNode;
}) {
  if (inscritos.length === 0) return <p className="text-sm">Nenhum atleta inscrito.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Atleta</th>
            {mostrarDelegacao && <th className="py-2 pr-4 font-medium">Delegação</th>}
            <th className="py-2 pr-4 font-medium">Inscrições</th>
            <th className="py-2 pr-4 font-medium">Avisos</th>
            <th className="py-2 pr-4 font-medium">Situação</th>
            {acoes && <th className="py-2 font-medium">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {inscritos.map((i) => (
            <tr key={i.id} className="border-b align-top">
              <td className="py-2 pr-4">{i.nome}</td>
              {mostrarDelegacao && <td className="py-2 pr-4">{i.delegacao}</td>}
              <td className="py-2 pr-4">
                {i.inscricoes.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </td>
              <td className="py-2 pr-4">
                {i.avisos.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  i.avisos.map((a) => (
                    <p key={a} className="text-red-600">
                      {a}
                    </p>
                  ))
                )}
              </td>
              <td className="py-2 pr-4">
                <Situacao i={i} />
              </td>
              {acoes && <td className="py-2">{acoes(i)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
