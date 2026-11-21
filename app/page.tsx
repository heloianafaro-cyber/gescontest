import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function Home() {
  const total = await prisma.usuario.count();
  return (
    <main className="space-y-4 p-8">
      <p>Usuários no banco: {total}</p>
      <Link href="/regulamentos" className="underline">
        Regulamentos
      </Link>
      <Link href="/agenda" className="block underline">
        Agenda de jogos
      </Link>
    </main>
  );
}
