   import { exigirPerfil } from "@/modules/usuarios/sessao";
   import { PaginaProvisoria } from "@/components/pagina-provisoria";

   export default async function Adm() {
     const sessao = await exigirPerfil("ADM");
     return <PaginaProvisoria titulo="Área do administrador" nome={sessao.user.name} />;
   }