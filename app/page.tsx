   import { prisma } from "@/lib/prisma";

   export default async function Home() {
     const total = await prisma.usuario.count();
     return <main className="p-8">Usuários no banco: {total}</main>;
   }