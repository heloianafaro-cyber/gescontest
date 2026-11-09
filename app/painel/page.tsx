   import { headers } from "next/headers";
   import { redirect } from "next/navigation";
   import { auth } from "@/lib/auth";
   import { BotaoSair } from "./botao-sair";

   export default async function Painel() {
     const sessao = await auth.api.getSession({ headers: await headers() });
     if (!sessao) redirect("/login");

     return (
       <main className="space-y-4 p-8">
         <h1 className="text-xl font-semibold">Olá, {sessao.user.name}</h1>
         <p>Perfil: {sessao.user.tipo}</p>
         <BotaoSair />
       </main>
     );
   }