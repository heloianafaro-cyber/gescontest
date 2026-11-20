// Regras puras da conferência das inscrições (RN191 a RN197). Sem banco, para poder testar à parte.

export type DatasConferencia = {
  conferenciaInicio: Date | null;
  conferenciaFim: Date | null;
  recursoFim: Date | null;
};

export type FaseConferencia = "NAO_CONFIGURADA" | "ANTES" | "CONFERENCIA" | "RECURSO" | "ENCERRADA";

export const ROTULO_FASE: Record<FaseConferencia, string> = {
  NAO_CONFIGURADA: "Sem conferência neste evento",
  ANTES: "A conferência ainda não começou",
  CONFERENCIA: "Conferência aberta",
  RECURSO: "Prazo de recurso aberto",
  ENCERRADA: "Conferência encerrada",
};

// Data de hoje no horário da Bahia, como "AAAA-MM-DD".
export function hojeNaBahia(agora = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bahia" }).format(agora);
}

const dia = (d: Date) => d.toISOString().slice(0, 10);

// Os dias de início e de fim contam inteiros (até o fim do dia).
export function faseDaConferencia(ev: DatasConferencia, hoje = hojeNaBahia()): FaseConferencia {
  if (!ev.conferenciaInicio || !ev.conferenciaFim) return "NAO_CONFIGURADA";
  if (hoje < dia(ev.conferenciaInicio)) return "ANTES";
  if (hoje <= dia(ev.conferenciaFim)) return "CONFERENCIA";
  if (ev.recursoFim && hoje <= dia(ev.recursoFim)) return "RECURSO";
  return "ENCERRADA";
}

type DadosAtleta = {
  fichaStatus: "PENDENTE" | "APROVADA" | "RECUSADA" | null;
  dataNascimento: Date | null;
};

// RN192: o sistema só AVISA; quem impugna é o coordenador.
export function avisosDoAtleta(
  atleta: DadosAtleta,
  evento: { idadeLimite: number | null; dataInicio: Date }
): string[] {
  const avisos: string[] = [];
  if (atleta.fichaStatus === "PENDENTE") avisos.push("Ficha de autorização pendente");
  if (atleta.fichaStatus === "RECUSADA") avisos.push("Ficha de autorização recusada");
  if (evento.idadeLimite != null && atleta.dataNascimento) {
    const idade = evento.dataInicio.getUTCFullYear() - atleta.dataNascimento.getUTCFullYear();
    if (idade > evento.idadeLimite) avisos.push(`Acima da idade limite (${idade} anos; limite ${evento.idadeLimite})`);
  }
  return avisos;
}
