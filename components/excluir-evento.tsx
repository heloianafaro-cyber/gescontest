   "use client";

   import { useActionState } from "react";
   import type { EstadoForm } from "@/modules/eventos/acoes";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";

   type Props = {
     acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
     nomeEvento: string;
   };

   export function ExcluirEvento({ acao, nomeEvento }: Props) {
     const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);

     return (
       <form action={enviar} className="max-w-md space-y-3 rounded-lg border border-red-300 p-4">
         <p className="font-medium text-red-700">Excluir evento</p>
         <p className="text-sm">
           Isso apaga também as modalidades, torneios, jogos, equipes e resultados deste evento. As
           contas dos atletas não são apagadas. Não dá para desfazer.
         </p>
         <div className="space-y-1">
           <Label htmlFor="confirmacao">Digite o nome do evento para confirmar: {nomeEvento}</Label>
           <Input id="confirmacao" name="confirmacao" autoComplete="off" required />
         </div>
         {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
         <Button type="submit" variant="destructive" disabled={pendente}>
           {pendente ? "Excluindo..." : "Excluir evento"}
         </Button>
       </form>
     );
   }