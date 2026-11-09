   "use client";

   import { useState } from "react";
   import { useRouter } from "next/navigation";
   import Link from "next/link";
   import { authClient } from "@/lib/auth-client";
   import { cadastroSchema } from "@/modules/usuarios/schemas";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";
   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

   export default function Cadastro() {
     const router = useRouter();
     const [erro, setErro] = useState("");
     const [carregando, setCarregando] = useState(false);

     async function enviar(e: React.FormEvent<HTMLFormElement>) {
       e.preventDefault();
       setErro("");
       const dados = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;

       const resultado = cadastroSchema.safeParse(dados);
       if (!resultado.success) {
         setErro(resultado.error.issues[0].message);
         return;
       }

       setCarregando(true);
       const { nome, email, senha, celular, cpf, matricula } = resultado.data;
       const { error } = await authClient.signUp.email({
         name: nome,
         email,
         password: senha,
         celular,
         cpf: cpf.replace(/\D/g, ""),
         matricula,
       });
       setCarregando(false);

       if (error) {
         setErro(error.message ?? "Não foi possível concluir o cadastro.");
         return;
       }
       router.push("/painel");
     }

     return (
       <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
         <Card className="w-full">
           <CardHeader>
             <CardTitle>Cadastro de atleta</CardTitle>
           </CardHeader>
           <CardContent>
             <form onSubmit={enviar} className="space-y-4">
               {[
                 ["nome", "Nome completo", "text"],
                 ["email", "E-mail", "email"],
                 ["senha", "Senha", "password"],
                 ["celular", "Celular (com DDD)", "tel"],
                 ["cpf", "CPF", "text"],
                 ["matricula", "Matrícula", "text"],
               ].map(([nome, rotulo, tipo]) => (
                 <div key={nome} className="space-y-1">
                   <Label htmlFor={nome}>{rotulo}</Label>
                   <Input id={nome} name={nome} type={tipo} />
                 </div>
               ))}
               {erro && <p className="text-sm text-red-600">{erro}</p>}
               <Button type="submit" className="w-full" disabled={carregando}>
                 {carregando ? "Enviando..." : "Cadastrar"}
               </Button>
               <p className="text-sm">
                 Já tem conta? <Link href="/login" className="underline">Entrar</Link>
               </p>
             </form>
           </CardContent>
         </Card>
       </main>
     );
   }