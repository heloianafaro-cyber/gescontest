import { prisma } from "@/lib/prisma";

// RN154: ao definir/reduzir a idade limite, retira das inscrições do evento os atletas acima do limite
// (contagem pelo ano de nascimento) e avisa o chefe de delegação e o próprio atleta.
// Devolve quantos atletas foram retirados.
export async function aplicarIdadeLimite(eventoId: number): Promise<number> {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: { nome: true, idadeLimite: true, dataInicio: true },
  });
  if (!evento || evento.idadeLimite == null) return 0;

  // Passa do limite quem nasceu antes de (ano do evento − limite).
  const anoCorte = evento.dataInicio.getUTCFullYear() - evento.idadeLimite;
  const nascidosAntes = new Date(Date.UTC(anoCorte, 0, 1));

  const vinculos = await prisma.equipeAtleta.findMany({
    where: {
      equipe: { modalidade: { eventoId } },
      atleta: { dataNascimento: { lt: nascidosAntes } },
    },
    include: {
      atleta: { select: { id: true, nome: true, delegacaoId: true } },
      equipe: {
        include: {
          modalidade: { select: { nome: true, tipo: true } },
          _count: { select: { partidasA: true, partidasB: true } },
        },
      },
    },
  });
  if (vinculos.length === 0) return 0;

  // Agrupa por atleta.
  const porAtleta = new Map<number, typeof vinculos>();
  for (const v of vinculos) {
    porAtleta.set(v.atletaId, [...(porAtleta.get(v.atletaId) ?? []), v]);
  }

  for (const [atletaId, lista] of porAtleta) {
    const atleta = lista[0].atleta;

    await prisma.$transaction(async (tx) => {
      for (const v of lista) {
        const temJogos = v.equipe._count.partidasA + v.equipe._count.partidasB > 0;
        if (v.equipe.modalidade.tipo === "INDIVIDUAL" && !temJogos) {
          await tx.equipe.delete({ where: { id: v.equipeId } }); // a equipe de 1 some com o atleta
        } else {
          await tx.equipeAtleta.delete({
            where: { atletaId_equipeId: { atletaId, equipeId: v.equipeId } },
          });
        }
      }
    });

    const modalidades = lista.map((v) => v.equipe.modalidade.nome).join(", ");
    const motivo =
      `porque o evento "${evento.nome}" passou a ter idade limite de ${evento.idadeLimite} anos ` +
      `(contada pelo ano de nascimento).`;

    // Aviso ao chefe de delegação (RN154) e ao próprio atleta.
    const destinos: { usuarioId: number; mensagem: string }[] = [];
    if (atleta.delegacaoId) {
      const chefes = await prisma.usuario.findMany({
        where: { tipo: "TECNICO", delegacaoId: atleta.delegacaoId },
        select: { id: true },
      });
      for (const c of chefes) {
        destinos.push({
          usuarioId: c.id,
          mensagem: `O atleta ${atleta.nome} foi retirado de ${modalidades}, ${motivo}`,
        });
      }
    }
    destinos.push({
      usuarioId: atletaId,
      mensagem: `Você foi retirado de ${modalidades}, ${motivo}`,
    });
    await prisma.notificacao.createMany({ data: destinos });
  }

  return porAtleta.size;
}