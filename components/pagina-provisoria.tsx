   import Link from "next/link";
   import { BotaoSair } from "@/components/botao-sair";

   type Props = {
     titulo: string;
     nome: string;
     links?: { href: string; rotulo: string }[];
   };

   export function PaginaProvisoria({ titulo, nome, links = [] }: Props) {
     return (
       <main className="space-y-4 p-8">
         <h1 className="text-xl font-semibold">{titulo}</h1>
         <p>Olá, {nome}</p>
         <nav className="flex flex-wrap items-center gap-4">
           {links.map((l) => (
             <Link key={l.href} href={l.href} className="underline">
               {l.rotulo}
             </Link>
           ))}
           <Link href="/notificacoes" className="underline">Notificações</Link>
           <BotaoSair />
         </nav>
       </main>
     );
   }