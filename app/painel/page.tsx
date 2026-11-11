   import { redirect } from "next/navigation";
   import { exigirPerfil, rotaInicial } from "@/modules/usuarios/sessao";
   export const instant = false;

   export default async function Painel() {
     const sessao = await exigirPerfil();
     redirect(rotaInicial[sessao.user.tipo as string] ?? "/login");
   }