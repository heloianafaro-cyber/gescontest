   import { headers } from "next/headers";
   import { redirect } from "next/navigation";
   import { auth } from "@/lib/auth";

   export const rotaInicial: Record<string, string> = {
     ATLETA: "/atleta",
     PROF: "/coordenador",
     STAFF: "/staff",
     TECNICO: "/tecnico",
     ADM: "/adm",
   };

   // Exige login e, se informado, um dos perfis permitidos.
   export async function exigirPerfil(...perfis: string[]) {
     const sessao = await auth.api.getSession({ headers: await headers() });
     if (!sessao) redirect("/login");

     const tipo = sessao.user.tipo as string;
     if (perfis.length > 0 && !perfis.includes(tipo)) {
       redirect(rotaInicial[tipo] ?? "/login");
     }
     return sessao;
   }