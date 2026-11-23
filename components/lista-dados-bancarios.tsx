import Link from "next/link";
import type { EventoComAtletas } from "@/modules/dados-bancarios/consultas-db";

// Lista só o estado (preenchido ou pendente); nenhum dado bancário passa por aqui (RN229).
export function ListaDadosBancarios({
  eventos,
  hrefAtleta,
  mostrarDelegacao,
}: {
  eventos: EventoComAtletas[];
  hrefAtleta: (eventoId: number, atletaId: number) => string;
  mostrarDelegacao: boolean;
}) {
  if (eventos.length === 0) {
    return <p className="text-sm">Nenhum atleta inscrito em evento que peça dados bancários.</p>;
  }
  return (
    <div className="space-y-8">
      {eventos.map((ev) => {
        const pendentes = ev.atletas.filter((a) => !a.preenchido).length;
        return (
          <section key={ev.id} className="space-y-2">
            <h2 className="font-medium">
              {ev.nome}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({ev.atletas.length - pendentes} de {ev.atletas.length} preenchidos)
              </span>
            </h2>
            <ul className="divide-y rounded-md border text-sm">
              {ev.atletas.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="font-medium">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[a.matricula ? `matrícula ${a.matricula}` : null, mostrarDelegacao ? a.delegacao : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={a.preenchido ? "text-green-700" : "text-amber-700"}>
                      {a.preenchido ? "Preenchido" : "Pendente"}
                    </span>
                    <Link href={hrefAtleta(ev.id, a.id)} prefetch={false} className="underline">Ver</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
