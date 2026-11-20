"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
};

export function FormMae({ acao }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);
  const valor = (c: string) => estado.valores?.[c] ?? "";

  return (
    <form action={enviar} className="max-w-md space-y-3">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome da modalidade</Label>
        <Input id="nome" name="nome" required defaultValue={valor("nome")} />
        <p className="text-xs text-muted-foreground">Ex.: Natação, Atletismo, Tênis de mesa</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="tipo">Tipo para os limites do evento</Label>
        <select
          id="tipo"
          name="tipo"
          required
          defaultValue={valor("tipo")}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
        >
          <option value="" disabled>Escolha...</option>
          <option value="INDIVIDUAL">Individual (inclui duplas e revezamentos)</option>
          <option value="COLETIVA">Coletiva</option>
        </select>
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Criando..." : "Criar modalidade"}
      </Button>
    </form>
  );
}