// RN206: lista de UMA delegação, separada por modalidade e prova, inclusive as sem inscritos.
// RN207: equipe abaixo do mínimo da modalidade recebe aviso. Lógica pura (sem banco).
import { avisoMinimo, celula, type AtletaLista } from "./listas-csv";

export type EquipeDelegacao = {
  id: number;
  nome: string;
  naipe: string;
  minimo: number;
  atletas: AtletaLista[];
};

export type ModalidadeDelegacao = {
  id: number;
  mae: string | null; // modalidade-mãe (quando esta é uma prova)
  nome: string;
  equipes: EquipeDelegacao[];
};

export type ListaDelegacao = {
  evento: string;
  delegacao: string;
  temPeso: boolean;
  temFaixa: boolean;
  modalidades: ModalidadeDelegacao[];
};

export function contarAvisos(l: ListaDelegacao): number {
  return l.modalidades.reduce(
    (s, m) => s + m.equipes.filter((e) => avisoMinimo(e.atletas.length, e.minimo) !== null).length,
    0
  );
}

export function listaDelegacaoParaCsv(l: ListaDelegacao): string {
  const cab = ["Modalidade", "Prova", "Equipe", "Naipe", "Atleta", "Ano de nascimento"];
  if (l.temPeso) cab.push("Peso (kg)", "Peso confirmado");
  if (l.temFaixa) cab.push("Faixa");
  cab.push("Aviso");

  const linhas: string[] = [cab.map(celula).join(";")];
  for (const m of l.modalidades) {
    const modalidade = m.mae ?? m.nome;
    const prova = m.mae ? m.nome : "";

    if (m.equipes.length === 0) {
      const v: (string | number | null)[] = [modalidade, prova, "", "", "", ""];
      if (l.temPeso) v.push("", "");
      if (l.temFaixa) v.push("");
      v.push("Sem inscritos");
      linhas.push(v.map(celula).join(";"));
      continue;
    }

    for (const e of m.equipes) {
      const aviso = avisoMinimo(e.atletas.length, e.minimo) ?? "";
      const atletas = e.atletas.length > 0 ? e.atletas : [null];
      for (const a of atletas) {
        const v: (string | number | null)[] = [modalidade, prova, e.nome, e.naipe, a?.nome ?? "", a?.anoNascimento ?? ""];
        if (l.temPeso) v.push(a?.pesoKg ?? "", a ? (a.pesoKg ? (a.pesoConfirmado ? "Sim" : "Não") : "") : "");
        if (l.temFaixa) v.push(a?.faixa ?? "");
        v.push(aviso);
        linhas.push(v.map(celula).join(";"));
      }
    }
  }
  return "﻿" + linhas.join("\r\n") + "\r\n";
}

export function nomeDeArquivoDelegacao(l: ListaDelegacao): string {
  const t = `${l.delegacao}-${l.evento}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `delegacao-${t || "lista"}.csv`;
}
