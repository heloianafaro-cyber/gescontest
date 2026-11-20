"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
};

export function FormDelegacao({ acao }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);

  return (
    <form action={enviar} className="max-w-md space-y-3">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome da delegação</Label>
        <Input id="nome" name="nome" required />
        <p className="text-xs text-muted-foreground">Ex.: Campus Central, Turma 3A</p>
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Adicionando..." : "Adicionar delegação"}
      </Button>
    </form>
  );
}
