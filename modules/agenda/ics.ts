// RN213: arquivo de calendário (.ics) para Google Agenda, Outlook, Apple e outros. Lógica pura (sem banco).

export type JogoIcs = {
  id: number;
  inicio: Date;
  fim: Date;
  titulo: string;
  local: string | null;
  descricao: string;
  cancelado: boolean;
};

// Texto de um campo: barra, ponto e vírgula, vírgula e quebra de linha precisam de escape (RFC 5545).
export function escaparTexto(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Linhas com mais de 75 bytes são quebradas; a continuação começa com um espaço.
export function dobrar(linha: string): string {
  const partes: string[] = [];
  let atual = "";
  let bytes = 0;
  let limite = 75;
  for (const ch of linha) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > limite) {
      partes.push(atual);
      atual = " ";
      bytes = 1;
      limite = 75;
    }
    atual += ch;
    bytes += n;
  }
  partes.push(atual);
  return partes.join("\r\n");
}

export function dataIcs(d: Date): string {
  const p = (n: number, t = 2) => String(n).padStart(t, "0");
  return `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

export function gerarIcs(p: { nome: string; jogos: JogoIcs[]; agora: Date }): string {
  const linhas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GesContest//Agenda de jogos//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escaparTexto(p.nome)}`,
    "X-WR-TIMEZONE:America/Bahia",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const j of p.jogos) {
    linhas.push(
      "BEGIN:VEVENT",
      `UID:jogo-${j.id}@gescontest`,
      `DTSTAMP:${dataIcs(p.agora)}`,
      `DTSTART:${dataIcs(j.inicio)}`,
      `DTEND:${dataIcs(j.fim)}`,
      `SUMMARY:${escaparTexto(j.titulo)}`
    );
    if (j.local) linhas.push(`LOCATION:${escaparTexto(j.local)}`);
    if (j.descricao) linhas.push(`DESCRIPTION:${escaparTexto(j.descricao)}`);
    linhas.push(`STATUS:${j.cancelado ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT");
  }
  linhas.push("END:VCALENDAR");
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}

export const ESCOPOS = ["evento", "modalidade", "torneio", "delegacao", "equipe"] as const;
export type Escopo = (typeof ESCOPOS)[number];

export function lerEscopo(valor: unknown): Escopo | null {
  return ESCOPOS.find((e) => e === valor) ?? null;
}

// "12.ics" ou "12" -> 12
export function lerIdDoArquivo(arquivo: unknown): number | null {
  if (typeof arquivo !== "string") return null;
  const m = /^(\d{1,9})(?:\.ics)?$/i.exec(arquivo);
  return m ? Number(m[1]) : null;
}
