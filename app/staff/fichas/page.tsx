   import { exigirPerfil } from "@/modules/usuarios/sessao";
   import { ListaFichas } from "@/components/lista-fichas";

   export const instant = false;

   export default async function Fichas() {
     await exigirPerfil("STAFF");
     return (
       <main className="space-y-4 p-8">
         <h1 className="text-xl font-semibold">Fichas pendentes</h1>
         <ListaFichas />
       </main>
     );
   }