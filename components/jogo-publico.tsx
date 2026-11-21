import { horaBahia, textoResultado } from "@/modules/publico/formato";
import type { JogoPublico } from "@/modules/publico/consultas";

// Uma linha de jogo nas páginas públicas: horário, local, modalidade, confronto e resultado (RN215, RN217).
export function JogoLinha({ jogo, mostrarModalidade = true }: { jogo: JogoPublico; mostrarModalidade?: boolean }) {
  const r = textoResultado(jogo.resultado);
  const venceuA = jogo.resultado.status === "ENCERRADA" && (jogo.resultado.placarA ?? 0) > (jogo.resultado.placarB ?? 0);
  const venceuB = jogo.resultado.status === "ENCERRADA" && (jogo.resultado.placarB ?? 0) > (jogo.resultado.placarA ?? 0);
  return (
    <li className="grid gap-x-4 gap-y-1 border-b py-2 text-sm sm:grid-cols-[6rem_1fr_auto]">
      <div className="text-muted-foreground">
        <p className="font-medium text-foreground">{jogo.dataHora ? horaBahia(jogo.dataHora) : "A definir"}</p>
        <p>{jogo.local ?? ""}</p>
      </div>
      <div className="space-y-0.5">
        {mostrarModalidade && (
          <p className="text-xs text-muted-foreground">
            {jogo.modalidade} · {jogo.torneio}
            {jogo.fase ? ` · ${jogo.fase}` : ""}
          </p>
        )}
        <p>
          <span className={venceuA ? "font-semibold" : ""}>{jogo.equipeA}</span>
          <span className="px-2 text-muted-foreground">×</span>
          <span className={venceuB ? "font-semibold" : ""}>{jogo.equipeB}</span>
        </p>
      </div>
      <div className="sm:text-right">
        <p className="font-medium">{r.principal}</p>
        {r.detalhe && <p className="text-xs text-muted-foreground">{r.detalhe}</p>}
      </div>
    </li>
  );
}
