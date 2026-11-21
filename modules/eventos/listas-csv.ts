// RN200: lista de atletas por torneio, para a arbitragem. Nunca inclui CPF, matrícula nem ficha.
// Este arquivo é lógica pura (sem banco), por isso pode ser testado sozinho.

export type AtletaLista = {
  nome: string;
  anoNascimento: number | null;
  pesoKg: string | null;
  pesoConfirmado: boolean;
  faixa: string | null;
};

export type EquipeLista = {
  id: number;
  nome: string;
  delegacao: string;
  naipe: string;
  grupo: number | null;
  cabeca: boolean;
  posicao: number | null;
  atletas: AtletaLista[];
};

export type ListaTorneio = {
  evento: string;
  modalidade: string;
  torneio: string;
  temPeso: boolean;
  temFaixa: boolean;
  equipes: EquipeLista[];
};

// Protege contra fórmulas do Excel (=, +, -, @) e escapa aspas e separadores.
function celula(valor: string | number | null): string {
  let t = valor === null ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  if (/[";\n\r]/.test(t)) t = `"${t.replace(/"/g, '""')}"`;
  return t;
}

// Separador ";" e BOM no início: o Excel em português abre com acentos e colunas certos.
export function listaParaCsv(l: ListaTorneio): string {
  const cab = ["Torneio", "Grupo", "Equipe", "Delegação", "Naipe", "Cabeça de chave", "Atleta", "Ano de nascimento"];
  if (l.temPeso) cab.push("Peso (kg)", "Peso confirmado");
  if (l.temFaixa) cab.push("Faixa");

  const linhas: string[] = [cab.map(celula).join(";")];
  for (const e of l.equipes) {
    const base = [l.torneio, e.grupo, e.nome, e.delegacao, e.naipe, e.cabeca ? "Sim" : "Não"];
    const atletas = e.atletas.length > 0 ? e.atletas : [null];
    for (const a of atletas) {
      const l2: (string | number | null)[] = [...base, a?.nome ?? "", a?.anoNascimento ?? ""];
      if (l.temPeso) l2.push(a?.pesoKg ?? "", a ? (a.pesoKg ? (a.pesoConfirmado ? "Sim" : "Não") : "") : "");
      if (l.temFaixa) l2.push(a?.faixa ?? "");
      linhas.push(l2.map(celula).join(";"));
    }
  }
  return "﻿" + linhas.join("\r\n") + "\r\n";
}

export function nomeDeArquivo(l: ListaTorneio): string {
  const t = `${l.modalidade}-${l.torneio}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `atletas-${t || "torneio"}.csv`;
}
