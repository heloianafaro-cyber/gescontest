   import { exigirPerfil } from "@/modules/usuarios/sessao";
   import { PaginaProvisoria } from "@/components/pagina-provisoria";

   export default async function Atleta() {
     const sessao = await exigirPerfil("ATLETA");
     return <PaginaProvisoria titulo="Área do atleta" nome={sessao.user.name} />;
   }