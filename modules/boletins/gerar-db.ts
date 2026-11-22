import { prisma } from "@/lib/prisma";
import { jogosDoEvento } from "@/modules/publico/consultas";
import { chaveDia, horaBahia, textoResultado } from "@/modules/publico/formato";
import { podioDoTorneio } from "@/modules/publico/podio-db";
import { tabelasDoTorneio } from "@/modules/torneios/classificacao-db";
import { nomeDoBoletim, resumoDeJogos, type ConteudoBoletim, type PodioBol, type ResultadosBol, type TabelaBol } from "./conteudo";

// Monta o boletim de um dia (ou o final, com dia = null). Só nomes de equipes (RN215).
export async function montarConteudo(eventoId: number, eventoNome: string, dia: string | null): Promise<ConteudoBoletim> {
  const todos = (await jogosDoEvento(eventoId)).filter((j) => j.resultado.status !== "CANCELADA");
  const jogos = dia ? todos.filter((j) => j.dataHora && chaveDia(j.dataHora) === dia) : todos;

  // Resultados: só jogos com resultado, por modalidade e torneio.
  const porTorneio = new Map<number, ResultadosBol & { id: number }>();
  for (const j of jogos) {
    if (j.resultado.status !== "ENCERRADA" && j.resultado.status !== "WO") continue;
    const r = porTorneio.get(j.torneioId) ?? { id: j.torneioId, modalidade: j.modalidade, torneio: j.torneio, jogos: [] };
    const t = textoResultado(j.resultado);
    r.jogos.push({
      hora: j.dataHora ? horaBahia(j.dataHora) : "",
      local: j.local,
      fase: j.fase,
      equipeA: j.equipeA,
      equipeB: j.equipeB,
      principal: t.principal,
      detalhe: t.detalhe,
    });
    porTorneio.set(j.torneioId, r);
  }
  const resultados = [...porTorneio.values()]
    .sort((a, b) => a.modalidade.localeCompare(b.modalidade, "pt-BR") || a.torneio.localeCompare(b.torneio, "pt-BR"))
    .map(({ id: _id, ...r }) => r);

  // Classificação e pódio dos torneios que tiveram jogos no dia (todos, no final).
  const torneiosEnvolvidos = new Map<number, { modalidade: string; torneio: string }>();
  for (const j of jogos) torneiosEnvolvidos.set(j.torneioId, { modalidade: j.modalidade, torneio: j.torneio });

  const tabelas: TabelaBol[] = [];
  const podios: PodioBol[] = [];
  const ordenados = [...torneiosEnvolvidos.entries()].sort(
    (a, b) => a[1].modalidade.localeCompare(b[1].modalidade, "pt-BR") || a[1].torneio.localeCompare(b[1].torneio, "pt-BR")
  );
  for (const [torneioId, nomes] of ordenados) {
    const dados = await tabelasDoTorneio(prisma, torneioId);
    if (dados) {
      for (const tab of dados.tabelas) {
        tabelas.push({
          ...nomes,
          grupo: tab.grupo !== null ? `Grupo ${String.fromCharCode(64 + tab.grupo)}` : null,
          linhas: tab.linhas.map((l) => ({
            pos: l.posicao,
            equipe: dados.nomes.get(l.equipeId) ?? "—",
            p: l.pontos,
            j: l.jogos,
            v: l.vitorias,
            e: l.empates,
            d: l.derrotas,
            pro: l.pro,
            contra: l.contra,
            saldo: l.saldo,
          })),
        });
      }
    }
    const podio = await podioDoTorneio(torneioId);
    if (podio?.completo) {
      podios.push({
        ...nomes,
        colocacoes: podio.colocacoes.map((c) => ({ posicao: c.posicao, equipe: podio.nomes.get(c.equipeId) ?? "—" })),
      });
    }
  }

  return {
    titulo: nomeDoBoletim(eventoNome, dia),
    dia,
    geradoEm: new Date().toISOString(),
    resumo: resumoDeJogos(jogos),
    resultados,
    tabelas,
    podios,
  };
}
