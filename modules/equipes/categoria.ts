import { prisma } from "@/lib/prisma";

// RN157/RN161: coloca a equipe de 1 atleta (prova individual) na categoria certa do torneio,
// usando naipe + peso/idade/faixa conforme a modalidade categoriza.
// Só atribui quando há UMA categoria compatível; se não houver (ou houver empate de critérios),
// o atleta fica sem categoria e o Staff resolve na pesagem.
// Devolve o nome da categoria atribuída, ou null.
export async function atribuirCategoria(equipeId: number): Promise<string | null> {
  const equipe = await prisma.equipe.findUnique({
    where: { id: equipeId },
    include: {
      modalidade: { include: { evento: true } },
      atletas: { include: { atleta: { select: { dataNascimento: true } } } },
    },
  });
  if (!equipe || equipe.modalidade.tipo !== "INDIVIDUAL") return null;
  const vinculo = equipe.atletas[0];
  if (!vinculo) return null;

  const m = equipe.modalidade;
  const luta = m.formatoPlacar === "LUTA";
  const peso = vinculo.pesoKg != null ? Number(vinculo.pesoKg) : null;
  const nasc = vinculo.atleta.dataNascimento;
  const idade = nasc ? m.evento.dataInicio.getUTCFullYear() - nasc.getUTCFullYear() : null;

  // Sempre começa limpando a categoria anterior (o absoluto não é mexido aqui).
  await prisma.torneioEquipe.deleteMany({
    where: { equipeId, torneio: { modalidadeId: m.id, absoluto: false } },
  });

  const torneios = await prisma.torneio.findMany({ where: { modalidadeId: m.id, absoluto: false } });

  const candidatos = torneios.filter((t) => {
    if (t.naipe && t.naipe !== "MISTO" && t.naipe !== equipe.naipe) return false;
    if (luta && m.catPeso) {
      if (peso == null) return false;
      if (t.pesoMin != null && peso < Number(t.pesoMin)) return false;
      if (t.pesoMax != null && peso > Number(t.pesoMax)) return false;
    }
    if (luta && m.catIdade) {
      if (idade == null) return false;
      if (t.idadeMin != null && idade < t.idadeMin) return false;
      if (t.idadeMax != null && idade > t.idadeMax) return false;
    }
    if (luta && m.catFaixa && t.faixas.length > 0) {
      if (!vinculo.faixa || !t.faixas.includes(vinculo.faixa)) return false;
    }
    return true;
  });
  if (candidatos.length === 0) return null;

  // No limite entre duas categorias de peso (ex.: 66 kg em "-66" e em "66 a 73"), vale a de menor peso máximo.
  candidatos.sort((a, b) => (a.pesoMax == null ? 1e9 : Number(a.pesoMax)) - (b.pesoMax == null ? 1e9 : Number(b.pesoMax)));
  const [primeiro, segundo] = candidatos;
  if (
    segundo &&
    String(primeiro.pesoMin) === String(segundo.pesoMin) &&
    String(primeiro.pesoMax) === String(segundo.pesoMax)
  ) {
    return null; // duas categorias iguais em peso: ambíguo
  }

  await prisma.torneioEquipe.create({ data: { torneioId: primeiro.id, equipeId } });
  return primeiro.nome;
}
