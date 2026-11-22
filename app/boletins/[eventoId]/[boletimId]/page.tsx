import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lerConteudo } from "@/modules/boletins/conteudo";
import { BoletimConteudo } from "@/components/boletim-conteudo";
import { BotaoImprimir } from "@/components/botao-imprimir";

export const instant = false;

// RN220: página pública do boletim, com impressão (e PDF pelo navegador).
export default async function BoletimPublico({ params }: { params: Promise<{ eventoId: string; boletimId: string }> }) {
  const p = await params;
  const eventoId = Number(p.eventoId);
  const boletimId = Number(p.boletimId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(boletimId)) notFound();

  const b = await prisma.boletim.findFirst({ where: { id: boletimId, eventoId, status: "PUBLICADO" }, select: { conteudo: true } });
  if (!b) notFound();
  const c = lerConteudo(b.conteudo);
  if (!c) notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-4 text-sm print:hidden">
        <Link href={`/boletins/${eventoId}`} className="underline">Outros boletins</Link>
        <BotaoImprimir />
        <span className="text-muted-foreground">Para salvar em PDF, escolha “Salvar como PDF” na impressão.</span>
      </div>
      <BoletimConteudo c={c} />
    </main>
  );
}
