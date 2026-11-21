import Link from "next/link";

type Item = { id: number; nome: string; modalidade: string; equipes: number };

// Escolha do torneio. "base" é o começo do endereço (coordenador ou staff).
export function IndiceListas({ torneios, base }: { torneios: Item[]; base: string }) {
  if (torneios.length === 0) return <p>Este evento ainda não tem torneios.</p>;
  return (
    <ul className="max-w-2xl space-y-2">
      {torneios.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="text-sm">
            <p className="font-medium">{t.modalidade} — {t.nome}</p>
            <p className="text-muted-foreground">{t.equipes} equipe(s)</p>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href={`${base}/${t.id}`} className="underline">Ver e imprimir</Link>
            <a href={`${base}/${t.id}/csv`} className="underline">CSV</a>
          </div>
        </li>
      ))}
    </ul>
  );
}
