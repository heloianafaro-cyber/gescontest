// Regras da pesagem que não dependem do banco (RN159, RN162).

export function idadeNoEvento(inicioEvento: Date, nascimento: Date | null): number | null {
  return nascimento ? inicioEvento.getUTCFullYear() - nascimento.getUTCFullYear() : null;
}

type Absoluto = { naipe: string | null; idadeMin: number | null; idadeMax: number | null; faixas: string[] };
type Atleta = { naipe: string; idade: number | null; faixa: string | null };
type Config = { catIdade: boolean; catFaixa: boolean };

// RN162: o atleta só entra num absoluto se atender a todas as restrições dele (naipe, idade, faixa).
export function elegivelAbsoluto(t: Absoluto, a: Atleta, cfg: Config): boolean {
  if (t.naipe && t.naipe !== "MISTO" && t.naipe !== a.naipe) return false;
  if (cfg.catIdade) {
    if ((t.idadeMin != null || t.idadeMax != null) && a.idade == null) return false;
    if (t.idadeMin != null && a.idade! < t.idadeMin) return false;
    if (t.idadeMax != null && a.idade! > t.idadeMax) return false;
  }
  if (cfg.catFaixa && t.faixas.length > 0) {
    if (!a.faixa || !t.faixas.includes(a.faixa)) return false;
  }
  return true;
}
