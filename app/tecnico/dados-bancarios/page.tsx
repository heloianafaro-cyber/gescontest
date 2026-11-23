import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { atletasPorEvento } from "@/modules/dados-bancarios/consultas-db";
import { ListaDadosBancarios } from "@/components/lista-dados-bancarios";

export const instant = false;

// RN228: o chefe só enxerga atletas da própria delegação.
export default async function DadosBancariosDoChefe() {
  const sessao = await exigirPerfil("TECNICO");
  const eu = await prisma.usuario.findUnique({ where: { id: Number(sessao.user.id) }, select: { delegacaoId: true } });

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Dados bancários dos atletas</h1>
        <p className="text-sm text-muted-foreground">
          Só atletas da sua delegação, em eventos que pedem esses dados. A lista mostra apenas se já foi preenchido; ver os
          dados completos fica registrado.
        </p>
        <Link href="/tecnico" className="text-sm underline">Voltar</Link>
      </div>
      {eu?.delegacaoId ? (
        <ListaDadosBancarios
          eventos={await atletasPorEvento({ delegacaoId: eu.delegacaoId })}
          hrefAtleta={(eventoId, atletaId) => `/tecnico/dados-bancarios/${atletaId}?evento=${eventoId}`}
          mostrarDelegacao={false}
        />
      ) : (
        <p className="text-sm">Sua conta ainda não tem delegação.</p>
      )}
    </main>
  );
}
