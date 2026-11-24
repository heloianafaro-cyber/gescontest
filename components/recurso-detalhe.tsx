import { rotuloDoJogo } from "@/modules/recursos/consultas-db";
import type { RecursoCompleto } from "@/modules/recursos/lista-db";

const assuntos = { ARBITRAGEM: "Atuação da arbitragem", ORGANIZACAO: "Organização", OUTRO: "Outro" } as const;
const status = { ABERTO: "Em análise", DEFERIDO: "Deferido", INDEFERIDO: "Indeferido" } as const;
const cor = { ABERTO: "text-amber-700", DEFERIDO: "text-green-700", INDEFERIDO: "text-red-600" } as const;
const dataHora = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

// Recurso completo (texto e link): só coordenadores e Staff chegam aqui (RN236).
export function RecursoDetalhe({ r }: { r: RecursoCompleto }) {
  const j = r.disputa;
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{rotuloDoJogo({ numero: j.numero, fase: j.fase, dataHora: j.dataHora, partida: j.partida })}</p>
      <p className="text-xs text-muted-foreground">
        {j.torneio.modalidade.evento.nome} · {j.torneio.modalidade.nome} · {j.torneio.nome}
      </p>
      <p>
        <strong>{assuntos[r.assunto]}</strong> · aberto por {r.abertoPor.nome} ({r.equipe.delegacao.nome}, equipe {r.equipe.nome}) em {dataHora(r.criadoEm)}
      </p>
      <p className="whitespace-pre-wrap rounded-md border p-3">{r.texto}</p>
      {r.linkProvas ? (
        <p>
          Provas:{" "}
          <a href={r.linkProvas} target="_blank" rel="noopener noreferrer" className="underline break-all">
            {r.linkProvas}
          </a>
        </p>
      ) : (
        <p className="text-muted-foreground">Sem link de provas.</p>
      )}
      <p className={cor[r.status]}>
        {status[r.status]}
        {r.decididoPor && r.decididoEm ? ` por ${r.decididoPor.nome} em ${dataHora(r.decididoEm)}` : ""}
      </p>
      {r.decisaoTexto && <p className="text-muted-foreground">Decisão: {r.decisaoTexto}</p>}
    </div>
  );
}
