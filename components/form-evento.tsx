   "use client";

   import { useActionState } from "react";
   import type { EstadoForm } from "@/modules/eventos/acoes";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";

   type EventoExistente = {
     nome: string;
     dataInicio: Date;
     dataFim: Date;
     idadeLimite: number | null;
     maxModTotal: number | null;
     maxModInd: number | null;
     maxModCol: number | null;
   };

   type Props = {
     acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
     rotuloBotao: string;
     evento?: EventoExistente;
   };

   const campos = [
     ["nome", "Nome do evento", "text", true, ""],
     ["dataInicio", "Data de início", "date", true, ""],
     ["dataFim", "Data de término", "date", true, ""],
     ["idadeLimite", "Idade limite (opcional)", "number", false, "Conta só o ano de nascimento"],
     ["maxModTotal", "Máximo de modalidades por atleta (opcional)", "number", false, "Em branco = sem limite"],
     ["maxModInd", "Máximo de provas individuais (opcional)", "number", false, "Em branco = sem limite"],
     ["maxModCol", "Máximo de modalidades coletivas (opcional)", "number", false, "Em branco = sem limite"],
   ] as const;

   const inicial: EstadoForm = { erro: "" };

   export function FormEvento({ acao, rotuloBotao, evento }: Props) {
     const [estado, enviar, pendente] = useActionState(acao, inicial);

     const padrao: Record<string, string> = evento
       ? {
           nome: evento.nome,
           dataInicio: evento.dataInicio.toISOString().slice(0, 10),
           dataFim: evento.dataFim.toISOString().slice(0, 10),
           idadeLimite: evento.idadeLimite?.toString() ?? "",
           maxModTotal: evento.maxModTotal?.toString() ?? "",
           maxModInd: evento.maxModInd?.toString() ?? "",
           maxModCol: evento.maxModCol?.toString() ?? "",
         }
       : {};

     return (
       <form action={enviar} className="max-w-md space-y-4">
         {campos.map(([nome, rotulo, tipo, obrigatorio, dica]) => (
           <div key={nome} className="space-y-1">
             <Label htmlFor={nome}>{rotulo}</Label>
             <Input
               id={nome}
               name={nome}
               type={tipo}
               required={obrigatorio}
               min={tipo === "number" ? 1 : undefined}
               defaultValue={estado.valores?.[nome] ?? padrao[nome]}
             />
             {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
           </div>
         ))}
         {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
         <Button type="submit" disabled={pendente}>
           {pendente ? "Salvando..." : rotuloBotao}
         </Button>
       </form>
     );
   }