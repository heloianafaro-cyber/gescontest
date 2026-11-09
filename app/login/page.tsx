   "use client";

   import { useState } from "react";
   import { useRouter } from "next/navigation";
   import Link from "next/link";
   import { authClient } from "@/lib/auth-client";
   import { loginSchema } from "@/modules/usuarios/schemas";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";
   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

   export default function Login() {
     const router = useRouter();
     const [erro, setErro] = useState("");
     const [carregando, setCarregando] = useState(false);

     async function enviar(e: React.FormEvent<HTMLFormElement>) {
       e.preventDefault();
       setErro("");
       const dados = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;

       const resultado = loginSchema.safeParse(dados);
       if (!resultado.success) {
         setErro(resultado.error.issues[0].message);
         return;
       }

       setCarregando(true);
       const { error } = await authClient.signIn.email({
         email: resultado.data.email,
         password: resultado.data.senha,
       });
       setCarregando(false);

       if (error) {
         setErro("E-mail ou senha incorretos.");
         return;
       }
       router.push("/painel");
     }

     return (
       <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
         <Card className="w-full">
           <CardHeader>
             <CardTitle>Entrar</CardTitle>
           </CardHeader>
           <CardContent>
             <form onSubmit={enviar} className="space-y-4">
               <div className="space-y-1">
                 <Label htmlFor="email">E-mail</Label>
                 <Input id="email" name="email" type="email" />
               </div>
               <div className="space-y-1">
                 <Label htmlFor="senha">Senha</Label>
                 <Input id="senha" name="senha" type="password" />
               </div>
               {erro && <p className="text-sm text-red-600">{erro}</p>}
               <Button type="submit" className="w-full" disabled={carregando}>
                 {carregando ? "Entrando..." : "Entrar"}
               </Button>
               <p className="text-sm">
                 Sem conta? <Link href="/cadastro" className="underline">Cadastre-se</Link>
               </p>
             </form>
           </CardContent>
         </Card>
       </main>
     );
   }