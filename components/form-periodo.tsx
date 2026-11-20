"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
};

export function FormPeriodo({ acao }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);
  const valor = (campo: string) => estado.valores?.[campo] ?? "";

  return (
    <form action={enviar} className="max-w-md space-y-3">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome do período</Label>
        <Input id="nome" name="nome" required defaultValue={valor("nome")} />
        <p className="text-xs text-muted-foreground">Ex.: Manhã, Tarde, Noite</p>
      </div>
      <div className="flex gap-3">
        <div className="space-y-1">
          <Label htmlFor="horaInicio">Início</Label>
          <Input id="horaInicio" name="horaInicio" type="time" required defaultValue={valor("horaInicio")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="horaFim">Fim</Label>
          <Input id="horaFim" name="horaFim" type="time" required defaultValue={valor("horaFim")} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="maxJogosPorLocal">Máximo de jogos por local (opcional)</Label>
        <Input
          id="maxJogosPorLocal"
          name="maxJogosPorLocal"
          type="number"
          min={1}
          defaultValue={valor("maxJogosPorLocal")}
        />
        <p className="text-xs text-muted-foreground">Vazio = quantos couberem no horário.</p>
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Adicionando..." : "Adicionar período"}
      </Button>
    </form>
  );
}
