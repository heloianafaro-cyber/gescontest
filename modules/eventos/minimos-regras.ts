// RN208: quando a rotina diária deve lembrar os chefes sobre equipes abaixo do mínimo.
// Lógica pura (sem banco), por isso pode ser testada sozinha.

const dia = (d: Date) => d.toISOString().slice(0, 10);
const MS_DIA = 24 * 60 * 60 * 1000;

// Quantos dias faltam para o fim das inscrições (0 = termina hoje; negativo = já terminou).
// "hoje" vem como "AAAA-MM-DD" (data da Bahia).
export function diasParaFimDasInscricoes(inscricaoFim: Date, hoje: string): number {
  return Math.round((Date.parse(`${dia(inscricaoFim)}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / MS_DIA);
}

export const DIAS_DE_AVISO = 3;

// Avisa nos últimos 3 dias de inscrição (inclusive o último), enquanto o evento não terminou.
export function deveAvisarMinimosHoje(
  ev: { inscricaoFim: Date | null; dataFim: Date },
  hoje: string
): boolean {
  if (dia(ev.dataFim) < hoje) return false;
  if (!ev.inscricaoFim) return false;
  const faltam = diasParaFimDasInscricoes(ev.inscricaoFim, hoje);
  return faltam >= 0 && faltam <= DIAS_DE_AVISO;
}
