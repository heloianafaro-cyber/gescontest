"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { sincronizarTorneio } from "./avanco";

// RN185: o coordenador decide à mão a ordem das equipes que os critérios não conseguiram desempatar.
export async function salvarDesempate(eventoId: number, modalidadeId: number, torneioId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const torneio = await prisma.torneio.findFirst({
    where: { id: torneioId, modalidadeId, modalidade: { eventoId } },
    select: { id: true },
  });
  if (!torneio) notFound();

  const volta = `/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios/${torneioId}/classificacao`;

  const ordens = new Map<number, number | null>();
  for (const [campo, valor] of formData.entries()) {
    const m = /^ordem_(\d+)$/.exec(campo);
    if (!m) continue;
    const texto = String(valor).trim();
    if (texto === "") {
      ordens.set(Number(m[1]), null);
      continue;
    }
    const n = Number(texto);
    if (!Number.isInteger(n) || n < 1) redirect(`${volta}?erro=${encodeURIComponent("Use números inteiros a partir de 1.")}`);
    ordens.set(Number(m[1]), n);
  }

  await prisma.$transaction(
    async (tx) => {
      for (const [equipeId, ordem] of ordens) {
        await tx.torneioEquipe.updateMany({ where: { torneioId, equipeId }, data: { desempateManual: ordem } });
      }
      await sincronizarTorneio(tx, torneioId);
    },
    { timeout: 60_000, maxWait: 20_000 }
  );

  revalidatePath(volta);
  revalidatePath(volta.replace("/classificacao", "/jogos"));
  redirect(`${volta}?ok=1`);
}
