// RN209/RN210: leitura segura do formulário de configuração da agenda. Lógica pura (sem banco).

export const DESCANSO_MIN = 0;
export const DESCANSO_MAX = 480; // 8 horas

export function lerDescanso(valor: unknown): number | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < DESCANSO_MIN || n > DESCANSO_MAX) return null;
  return n;
}

// Cada modalidade tem um campo "descanso:<id>". Devolve os valores válidos e os ids com valor inválido.
export function lerDescansos(
  campos: Iterable<[string, unknown]>,
  modalidadesDoEvento: Set<number>
): { validos: { modalidadeId: number; minutos: number }[]; invalidos: number[] } {
  const validos: { modalidadeId: number; minutos: number }[] = [];
  const invalidos: number[] = [];
  for (const [nome, valor] of campos) {
    const m = /^descanso:(\d+)$/.exec(nome);
    if (!m) continue;
    const modalidadeId = Number(m[1]);
    if (!modalidadesDoEvento.has(modalidadeId)) continue;
    const minutos = lerDescanso(valor);
    if (minutos === null) invalidos.push(modalidadeId);
    else validos.push({ modalidadeId, minutos });
  }
  return { validos, invalidos };
}

// Cada marcação chega como "modalidadeId:localId". Só vale se os dois pertencem ao evento.
export function lerLigacoes(
  valores: unknown[],
  modalidadesDoEvento: Set<number>,
  locaisDoEvento: Set<number>
): { modalidadeId: number; localId: number }[] {
  const vistos = new Set<string>();
  const saida: { modalidadeId: number; localId: number }[] = [];
  for (const v of valores) {
    if (typeof v !== "string") continue;
    const m = /^(\d+):(\d+)$/.exec(v);
    if (!m) continue;
    const modalidadeId = Number(m[1]);
    const localId = Number(m[2]);
    if (!modalidadesDoEvento.has(modalidadeId) || !locaisDoEvento.has(localId)) continue;
    const chave = `${modalidadeId}:${localId}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push({ modalidadeId, localId });
  }
  return saida;
}
