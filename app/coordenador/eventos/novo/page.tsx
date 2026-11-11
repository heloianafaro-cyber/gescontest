   import { exigirPerfil } from "@/modules/usuarios/sessao";
   import { FormEvento } from "@/components/form-evento";

   export const instant = false;

   export default async function NovoEvento() {
     await exigirPerfil("PROF");
     return (
       <main className="space-y-4 p-8">
         <h1 className="text-xl font-semibold">Novo evento</h1>
         <FormEvento />
       </main>
     );
   }