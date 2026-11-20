"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
};

const estiloSelect =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

export function FormEquipe({ acao }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);
  const valor = (c: string) => estado.valores?.[c] ?? "";

  return (
    <form action={enviar} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome da equipe</Label>
        <Input id="nome" name="nome" required defaultValue={valor("nome")} />
        <p className="text-xs text-muted-foreground">Ex.: Campus Central A, Turma 3A</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="naipe">Naipe</Label>
        <select id="naipe" name="naipe" required className={estiloSelect} defaultValue={valor("naipe")}>
          <option value="" disabled>Escolha...</option>
          <option value="MASCULINO">Masculino</option>
          <option value="FEMININO">Feminino</option>
          <option value="MISTO">Misto</option>
        </select>
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Criando..." : "Criar equipe"}
      </Button>
    </form>
  );
}