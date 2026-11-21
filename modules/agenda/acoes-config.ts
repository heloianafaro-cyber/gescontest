"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { lerDescansos, lerLigacoes } from "@/modules/agenda/config";

export async function salvarConfigAgenda(eventoId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const base = `/coordenador/eventos/${eventoId}/agenda`;
  const erro = (msg: string): never => redirect(`${base}?erro=${encodeURIComponent(msg)}`);

  const [modalidades, locais] = await Promise.all([
    prisma.modalidade.findMany({ where: { eventoId }, select: { id: true, nome: true } }),
    prisma.local.findMany({ where: { eventoId }, select: { id: true } }),
  ]);
  const idsModalidades = new Set(modalidades.map((m) => m.id));

  const { validos, invalidos } = lerDescansos(formData.entries(), idsModalidades);
  if (invalidos.length > 0) {
    const nomes = modalidades.filter((m) => invalidos.includes(m.id)).map((m) => m.nome);
    erro(`O descanso deve ser um número inteiro de minutos, de 0 a 480. Corrija: ${nomes.join(", ")}.`);
  }

  const ligacoes = lerLigacoes(formData.getAll("ml"), idsModalidades, new Set(locais.map((l) => l.id)));

  await prisma.$transaction([
    ...validos.map((d) =>
      prisma.modalidade.update({ where: { id: d.modalidadeId }, data: { descansoEquipeMin: d.minutos } })
    ),
    prisma.modalidadeLocal.deleteMany({ where: { modalidade: { eventoId } } }),
    prisma.modalidadeLocal.createMany({ data: ligacoes }),
  ]);

  redirect(`${base}?ok=${encodeURIComponent("Configuração da agenda salva.")}`);
}
