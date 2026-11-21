// RN212: conferência de um horário escolhido à mão. Lógica pura (sem banco).
import { DESLOCAMENTO_BAHIA_MIN, paraEpochMin, type Ocupacao } from "./distribuir";

export type Aviso =
  | { tipo: "LOCAL"; jogoId: number }
  | { tipo: "EQUIPE"; jogoId: number }
  | { tipo: "LOCAL_NAO_MARCADO" }
  | { tipo: "FORA_DO_PERIODO" }
  | { tipo: "ANTES_DA_DEPENDENCIA" }
  | { tipo: "ANTES_DO_FIM_PARA_SEGUINTE"; jogoId: number };

export type JogoEditado = {
  jogoId: number;
  localId: number;
  inicio: number; // minutos desde 1970 (UTC)
  fim: number;
  intervaloMin: number;
  descansoMin: number;
  equipes: number[];
};

export type ContextoConferencia = {
  outros: Ocupacao[]; // tudo que já está no calendário, menos o próprio jogo
  locaisMarcados: number[]; // locais marcados para a modalidade
  janelas: { inicio: number; fim: number }[]; // períodos do dia nos dias do evento
  fimDasDependencias: number[]; // fim dos jogos de que este depende (já com horário)
  inicioDosSeguintes: { jogoId: number; inicio: number }[]; // jogos que dependem deste (já com horário)
};

export function avisosDoHorario(j: JogoEditado, c: ContextoConferencia): Aviso[] {
  const avisos: Aviso[] = [];

  for (const o of c.outros) {
    if (o.jogoId === j.jogoId) continue;
    if (o.localId === j.localId && j.inicio < o.fim + o.intervaloMin && o.inicio < j.fim + j.intervaloMin) {
      avisos.push({ tipo: "LOCAL", jogoId: o.jogoId });
    }
    if (j.equipes.some((e) => o.equipes.includes(e)) && j.inicio < o.fim + j.descansoMin && o.inicio < j.fim + j.descansoMin) {
      avisos.push({ tipo: "EQUIPE", jogoId: o.jogoId });
    }
  }

  if (!c.locaisMarcados.includes(j.localId)) avisos.push({ tipo: "LOCAL_NAO_MARCADO" });
  if (!c.janelas.some((w) => j.inicio >= w.inicio && j.fim <= w.fim)) avisos.push({ tipo: "FORA_DO_PERIODO" });
  if (c.fimDasDependencias.some((f) => j.inicio < f + j.descansoMin)) avisos.push({ tipo: "ANTES_DA_DEPENDENCIA" });
  for (const s of c.inicioDosSeguintes) {
    if (s.inicio < j.fim + j.descansoMin) avisos.push({ tipo: "ANTES_DO_FIM_PARA_SEGUINTE", jogoId: s.jogoId });
  }
  return avisos;
}

// "2026-12-01T08:30" (hora da Bahia, como o campo datetime-local entrega) -> minutos desde 1970 (UTC).
export function lerDataHoraBahia(texto: unknown): number | null {
  if (typeof texto !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const h = Number(m[2]);
  const min = Number(m[3]);
  if (h > 23 || min > 59) return null;
  const [a, mes, d] = m[1].split("-").map(Number);
  const teste = new Date(Date.UTC(a, mes - 1, d));
  if (teste.getUTCMonth() !== mes - 1 || teste.getUTCDate() !== d) return null; // 31/02 etc.
  return paraEpochMin(m[1], h * 60 + min, DESLOCAMENTO_BAHIA_MIN);
}

// Minutos desde 1970 (UTC) -> "2026-12-01T08:30" na hora da Bahia, para preencher o campo datetime-local.
export function paraCampoBahia(epochMin: number): string {
  const d = new Date((epochMin + DESLOCAMENTO_BAHIA_MIN) * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// Dias do evento ("AAAA-MM-DD"), do início ao fim, inclusive. Só esses dias podem receber jogos.
export function diasDoEvento(inicio: Date, fim: Date): string[] {
  const dia = (d: Date) => d.toISOString().slice(0, 10);
  const dias: string[] = [];
  const fimTxt = dia(fim);
  for (let d = new Date(`${dia(inicio)}T00:00:00Z`); dia(d) <= fimTxt && dias.length < 60; d = new Date(d.getTime() + 86400000)) {
    dias.push(dia(d));
  }
  return dias;
}

// Junta o dia escolhido na lista e a hora ("HH:MM") no formato que lerDataHoraBahia entende.
export function juntarDiaHora(dia: unknown, hora: unknown, diasValidos: string[]): string | null {
  if (typeof dia !== "string" || typeof hora !== "string") return null;
  if (!diasValidos.includes(dia)) return null;
  if (!/^\d{2}:\d{2}$/.test(hora.trim())) return null;
  return `${dia}T${hora.trim()}`;
}
