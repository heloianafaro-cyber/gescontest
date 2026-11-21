import { exigirPerfil } from "@/modules/usuarios/sessao";
import { PaginaProvisoria } from "@/components/pagina-provisoria";

export const instant = false;

export default async function Staff() {
  const sessao = await exigirPerfil("STAFF");

  return (
    <PaginaProvisoria
      titulo="Área do staff"
      nome={sessao.user.name}
      links={[
        { href: "/staff/fichas", rotulo: "Fichas pendentes" },
        { href: "/staff/pesagem", rotulo: "Pesagem" },
        { href: "/staff/jogos", rotulo: "Resultados de jogos e combates" },
        { href: "/staff/listas", rotulo: "Listas de atletas por torneio" },
      ]}
    />
  );
}
