import { prisma } from "@/lib/prisma";
import { apagarArquivo } from "@/lib/storage";
import { notificar } from "@/modules/eventos/notificar";
import { decidirFicha } from "./retencao";

export type ResultadoLimpeza = { analisadas: number; apagadas: number; simuladas: number; falhas: number };

// RN109, RN110, RN224: apaga as fichas vencidas (arquivo e registro) e avisa o atleta.
// O sistema ainda não guarda a data de envio da ficha, então ela é anotada na primeira passagem da rotina
// depois do envio (no máximo 1 dia de atraso, nunca antes). Com simular = true nada é apagado.
export async function limparFichas(hoje: string, simular = false): Promise<ResultadoLimpeza> {
  const atletas = await prisma.usuario.findMany({
    where: { tipo: "ATLETA", fichaArquivo: { not: null } },
    select: {
      id: true,
      fichaArquivo: true,
      fichaEnviadaEm: true,
      fichaArquivoVisto: true,
      equipesComoAtleta: { select: { equipe: { select: { modalidade: { select: { evento: { select: { dataFim: true } } } } } } } },
    },
  });

  const r: ResultadoLimpeza = { analisadas: atletas.length, apagadas: 0, simuladas: 0, falhas: 0 };
  for (const a of atletas) {
    const chave = a.fichaArquivo as string;

    // Ficha nova (ou trocada): começa a contar hoje.
    let enviadaEm = a.fichaEnviadaEm ? a.fichaEnviadaEm.toISOString().slice(0, 10) : null;
    if (a.fichaArquivoVisto !== chave || enviadaEm === null) {
      enviadaEm = hoje;
      if (!simular) {
        await prisma.usuario.update({
          where: { id: a.id },
          data: { fichaArquivoVisto: chave, fichaEnviadaEm: new Date(`${hoje}T00:00:00Z`) },
        });
      }
    }

    const fimDosEventos = a.equipesComoAtleta.map((e) => e.equipe.modalidade.evento.dataFim.toISOString().slice(0, 10));
    const d = decidirFicha({ hoje, enviadaEm, fimDosEventos });
    if (!d.apagar) continue;

    if (simular) {
      r.simuladas++;
      continue;
    }
    try {
      await apagarArquivo(chave); // se falhar, mantém o registro e tenta de novo amanhã
    } catch {
      r.falhas++;
      continue;
    }
    await prisma.usuario.update({
      where: { id: a.id },
      data: { fichaArquivo: null, fichaStatus: null, fichaMotivoRecusa: null, fichaEnviadaEm: null, fichaArquivoVisto: null },
    });
    await notificar(
      [a.id],
      "Sua ficha de autorização foi apagada do sistema, conforme o prazo de guarda de 30 dias após o evento. Para participar de um novo evento, envie uma nova ficha."
    );
    r.apagadas++;
  }
  return r;
}
