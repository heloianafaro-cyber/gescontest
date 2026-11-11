   "use client";

   import { useState } from "react";
   import { useRouter } from "next/navigation";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";

   export function EnviarFicha() {
     const router = useRouter();
     const [erro, setErro] = useState("");
     const [enviando, setEnviando] = useState(false);

     async function enviar(e: React.FormEvent<HTMLFormElement>) {
       e.preventDefault();
       setErro("");
       setEnviando(true);
       const resposta = await fetch("/api/ficha", { method: "POST", body: new FormData(e.currentTarget) });
       setEnviando(false);

       if (!resposta.ok) {
         const dados = await resposta.json().catch(() => null);
         setErro(dados?.erro ?? "Não foi possível enviar o arquivo.");
         return;
       }
       router.refresh();
     }

     return (
       <form onSubmit={enviar} className="max-w-md space-y-3 px-8 pb-8">
         <div className="space-y-1">
           <Label htmlFor="ficha">Ficha de autorização (PDF, JPG ou PNG, até 4 MB)</Label>
           <Input id="ficha" name="ficha" type="file" accept=".pdf,.jpg,.jpeg,.png" />
         </div>
         {erro && <p className="text-sm text-red-600">{erro}</p>}
         <Button type="submit" disabled={enviando}>
           {enviando ? "Enviando..." : "Enviar ficha"}
         </Button>
       </form>
     );
   }