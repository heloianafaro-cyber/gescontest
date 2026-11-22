import type { PodioDoTorneio } from "@/modules/publico/podio-db";

const MEDALHA: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

// Quadro de pódio de um torneio (RN218). Não mostra nada enquanto o torneio não terminou.
export function PodioTorneio({ podio }: { podio: PodioDoTorneio }) {
  if (!podio.completo) return null;
  return (
    <ol className="space-y-1 text-sm">
      {podio.colocacoes.map((c, i) => (
        <li key={`${c.posicao}-${c.equipeId}-${i}`} className="flex items-center gap-2">
          <span aria-hidden>{MEDALHA[c.posicao]}</span>
          <span className="w-8 text-muted-foreground">{c.posicao}º</span>
          <span className="font-medium">{podio.nomes.get(c.equipeId) ?? "—"}</span>
        </li>
      ))}
    </ol>
  );
}
