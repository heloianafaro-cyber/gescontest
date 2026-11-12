   "use client";

   import { useActionState } from "react";
   import type { EstadoForm } from "@/modules/eventos/acoes";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";

   type Props = {
     acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
     rotuloBotao: string;
     modalidade?: {
       nome: string;
       tipo: string;
       minAtletas: number;
       maxAtletas: number;
       formatoPlacar: string | null;
     };
   };

   const estiloSelect =
     "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

   export function FormModalidade({ acao, rotuloBotao, modalidade }: Props) {
     const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);

     const valor = (campo: string, padrao: string) => estado.valores?.[campo] ?? padrao;

     return (
       <form action={enviar} className="max-w-md space-y-4">
         <div className="space-y-1">
           <Label htmlFor="nome">Nome da modalidade</Label>
           <Input id="nome" name="nome" required defaultValue={valor("nome", modalidade?.nome ?? "")} />
         </div>

         <div className="space-y-1">
           <Label htmlFor="tipo">Tipo</Label>
           <select
             id="tipo"
             name="tipo"
             required
             className={estiloSelect}
             defaultValue={valor("tipo", modalidade?.tipo ?? "")}
           >
             <option value="" disabled>Escolha...</option>
             <option value="INDIVIDUAL">Individual (prova)</option>
             <option value="COLETIVA">Coletiva (equipe)</option>
           </select>
         </div>

         <div className="flex gap-3">
           <div className="space-y-1">
             <Label htmlFor="minAtletas">Mínimo de atletas</Label>
             <Input
               id="minAtletas"
               name="minAtletas"
               type="number"
               min={1}
               required
               defaultValue={valor("minAtletas", String(modalidade?.minAtletas ?? 1))}
             />
           </div>
           <div className="space-y-1">
             <Label htmlFor="maxAtletas">Máximo de atletas</Label>
             <Input
               id="maxAtletas"
               name="maxAtletas"
               type="number"
               min={1}
               required
               defaultValue={valor("maxAtletas", String(modalidade?.maxAtletas ?? 1))}
             />
           </div>
         </div>

         <div className="space-y-1">
           <Label htmlFor="formatoPlacar">Formato do placar</Label>
           <select
             id="formatoPlacar"
             name="formatoPlacar"
             className={estiloSelect}
             defaultValue={valor("formatoPlacar", modalidade?.formatoPlacar ?? "")}
           >
             <option value="">Sem placar (marca ou colocação)</option>
             <option value="CORRIDO">Placar corrido (futsal, handebol...)</option>
             <option value="SETS">Por sets (vôlei, tênis de mesa...)</option>
           </select>
         </div>

         {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
         <Button type="submit" disabled={pendente}>
           {pendente ? "Salvando..." : rotuloBotao}
         </Button>
       </form>
     );
   }