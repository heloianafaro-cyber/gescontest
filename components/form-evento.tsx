   "use client";

   import { useActionState } from "react";
   import { criarEvento, type EstadoForm } from "@/modules/eventos/acoes";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";

   const inicial: EstadoForm = { erro: "" };

   const campos = [
     ["nome", "Nome do evento", "text", true, ""],
     ["dataInicio", "Data de início", "date", true, ""],
     ["dataFim", "Data de término", "date", true, ""],
     ["idadeLimite", "Idade limite (opcional)", "number", false, "Conta só o ano de nascimento"],
     ["maxModTotal", "Máximo de modalidades por atleta (opcional)", "number", false, "Em branco = sem limite"],
     ["maxModInd", "Máximo de provas individuais (opcional)", "number", false, "Em branco = sem limite"],
     ["maxModCol", "Máximo de modalidades coletivas (opcional)", "number", false, "Em branco = sem limite"],
   ] as const;

   export function FormEvento() {
     const [estado, acao, pendente] = useActionState(criarEvento, inicial);

     return (
       <form action={acao} className="max-w-md space-y-4">
         {campos.map(([nome, rotulo, tipo, obrigatorio, dica]) => (
           <div key={nome} className="space-y-1">
             <Label htmlFor={nome}>{rotulo}</Label>
             <Input id={nome} name={nome} type={tipo} required={obrigatorio} min={tipo === "number" ? 1 : undefined} />
             {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
           </div>
         ))}
         {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
         <Button type="submit" disabled={pendente}>
           {pendente ? "Salvando..." : "Criar evento"}
         </Button>
       </form>
     );
   }