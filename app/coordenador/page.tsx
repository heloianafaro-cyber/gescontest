import { exigirPerfil } from "@/modules/usuarios/sessao";
import { PaginaProvisoria } from "@/components/pagina-provisoria";

export const instant = false;

export default async function Coordenador() {
  const sessao = await exigirPerfil("PROF");
  return (
    <PaginaProvisoria
      titulo="Área do coordenador"
      nome={sessao.user.name}
      links={[
        { href: "/coordenador/eventos", rotulo: "Eventos" },
        { href: "/coordenador/delegacoes", rotulo: "Delegações" },
        { href: "/coordenador/contas", rotulo: "Contas de Staff e Chefes de delegação" },
        { href: "/coordenador/fichas", rotulo: "Fichas pendentes" },
      ]}
    />
  );
}
