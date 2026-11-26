import { exigirPerfil } from "@/modules/usuarios/sessao";
import { PaginaProvisoria } from "@/components/pagina-provisoria";

export const instant = false;

export default async function Adm() {
  const sessao = await exigirPerfil("ADM");
  return (
    <PaginaProvisoria
      titulo="Área do administrador"
      nome={sessao.user.name}
      links={[{ href: "/adm/contas", rotulo: "Contas de usuários" }]}
    />
  );
}
