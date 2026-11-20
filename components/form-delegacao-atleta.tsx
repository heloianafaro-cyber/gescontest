"use client";

import { useActionState } from "react";
import { escolherDelegacao, type EstadoDelegacaoAtleta } from "@/modules/usuarios/delegacao-atleta";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  delegacoes: { id: number; nome: string }[];
  atualId: number | null;
};

export function FormDelegacaoAtleta({ delegacoes, atualId }: Props) {
  const [estado, enviar, pendente] = useActionState(escolherDelegacao, { erro: "" } as EstadoDelegacaoAtleta);

  return (
    <form action={enviar} className="max-w-md space-y-3">
      <div className="space-y-1">
        <Label htmlFor="delegacaoId">Delegação</Label>
        <select
          id="delegacaoId"
          name="delegacaoId"
          required
          defaultValue={atualId ?? ""}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
        >
          <option value="" disabled>Escolha...</option>
          {delegacoes.map((d) => (
            <option key={d.id} value={d.id}>{d.nome}</option>
          ))}
        </select>
        {atualId && (
          <p className="text-xs text-muted-foreground">
            Ao trocar de delegação, você sai das equipes da delegação anterior.
          </p>
        )}
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-green-700">Delegação salva.</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar delegação"}
      </Button>
    </form>
  );
}