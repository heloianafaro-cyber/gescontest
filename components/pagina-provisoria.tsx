   import { BotaoSair } from "@/components/botao-sair";

   export function PaginaProvisoria({ titulo, nome }: { titulo: string; nome: string }) {
     return (
       <main className="space-y-4 p-8">
         <h1 className="text-xl font-semibold">{titulo}</h1>
         <p>Olá, {nome}</p>
         <BotaoSair />
       </main>
     );
   }