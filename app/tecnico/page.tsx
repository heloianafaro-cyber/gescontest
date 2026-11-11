   import { exigirPerfil } from "@/modules/usuarios/sessao";
   import { PaginaProvisoria } from "@/components/pagina-provisoria";
   export const instant = false;

   export default async function Tecnico() {
     const sessao = await exigirPerfil("TECNICO");
     return <PaginaProvisoria titulo="Área do técnico" nome={sessao.user.name} />;
   }