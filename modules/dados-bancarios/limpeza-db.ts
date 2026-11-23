import { prisma } from "@/lib/prisma";
import { notificar } from "@/modules/eventos/notificar";
import { decidirFicha } from "@/modules/fichas/retencao";

export type ResultadoLimpezaBanco = { analisados: number; apagados: number; simulados: number };

// RN230: apaga os dados bancários 30 dias depois do fim do último evento (que pede esses dados) em que o atleta
// está inscrito; sem inscrição em evento que pede, 30 dias depois do envio. Nunca antes de 30 dias do envio.
// Usa a mesma regra de prazo das fichas. Com simular = true nada é apagado.
export async function limparDadosBancarios(hoje: string, simular = false): Promise<ResultadoLimpezaBanco> {
  const dados = await prisma.dadoBancario.findMany({
    select: {
      usuarioId: true,
      informadoEm: true,
      usuario: {
        select: {
          equipesComoAtleta: {
            where: { equipe: { modalidade: { evento: { pedeDadosBancarios: true } } } },
            select: { equipe: { select: { modalidade: { select: { evento: { select: { dataFim: true } } } } } } },
          },
        },
      },
    },
  });

  const r: ResultadoLimpezaBanco = { analisados: dados.length, apagados: 0, simulados: 0 };
  for (const d of dados) {
    const fimDosEventos = d.usuario.equipesComoAtleta.map((e) =>
      e.equipe.modalidade.evento.dataFim.toISOString().slice(0, 10)
    );
    const decisao = decidirFicha({ hoje, enviadaEm: d.informadoEm.toISOString().slice(0, 10), fimDosEventos });
    if (!decisao.apagar) continue;
    if (simular) {
      r.simulados++;
      continue;
    }
    await prisma.dadoBancario.delete({ where: { usuarioId: d.usuarioId } });
    await notificar(
      [d.usuarioId],
      "Seus dados bancários foram apagados do sistema, conforme o prazo de guarda de 30 dias após o evento. Se um novo evento pedir, você poderá informá-los de novo."
    );
    r.apagados++;
  }
  return r;
}
