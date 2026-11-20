import { exigirPerfil } from "@/modules/usuarios/sessao";
import { PaginaProvisoria } from "@/components/pagina-provisoria";

export const instant = false;

export default async function Tecnico() {
  const sessao = await exigirPerfil("TECNICO");
  return (
    <PaginaProvisoria
      titulo="Área do chefe de delegação"
      nome={sessao.user.name}
      links={[
        { href: "/tecnico/atletas", rotulo: "Atletas" },
        { href: "/tecnico/equipes", rotulo: "Equipes" },
        { href: "/tecnico/auxiliares", rotulo: "Técnicos e assistentes" },
        { href: "/tecnico/conferencia", rotulo: "Conferência das inscrições" },
      ]}
    />
  );
}
