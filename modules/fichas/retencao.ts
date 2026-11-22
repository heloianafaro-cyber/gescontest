// RN109, RN110, RN224: quando a ficha de autorização de um atleta deve ser apagada. Lógica pura (sem banco).

export const DIAS_RETENCAO = 30;

// "2026-11-22" + 30 dias -> "2026-12-22" (datas em texto, sem fuso).
export function somarDias(chave: string, dias: number): string {
  const d = new Date(`${chave}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export type Motivo = "EVENTO_ENCERRADO" | "SEM_INSCRICAO";

// - Atleta inscrito em equipes: a ficha vale até 30 dias depois do fim do último evento dele (RN109).
// - Atleta sem nenhuma inscrição: a ficha vale 30 dias depois do envio (RN110).
// - Proteção (RN224): nunca apaga uma ficha enviada há menos de 30 dias, mesmo que o evento antigo já tenha acabado.
export function decidirFicha(p: {
  hoje: string;
  enviadaEm: string; // dia em que a ficha foi enviada
  fimDosEventos: string[]; // fim dos eventos em que o atleta está inscrito
}): { apagar: boolean; apagarEm: string; motivo: Motivo } {
  const porEnvio = somarDias(p.enviadaEm, DIAS_RETENCAO);
  if (p.fimDosEventos.length === 0) {
    return { apagar: p.hoje >= porEnvio, apagarEm: porEnvio, motivo: "SEM_INSCRICAO" };
  }
  const ultimoFim = [...p.fimDosEventos].sort().at(-1) as string;
  const porEvento = somarDias(ultimoFim, DIAS_RETENCAO);
  const apagarEm = porEvento > porEnvio ? porEvento : porEnvio;
  return { apagar: p.hoje >= apagarEm, apagarEm, motivo: "EVENTO_ENCERRADO" };
}
