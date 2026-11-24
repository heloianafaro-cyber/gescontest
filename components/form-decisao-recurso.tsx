"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inicial: EstadoForm = { erro: "" };

export function FormDecisaoRecurso({ acao }: { acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm> }) {
  const [estado, enviar, pendente] = useActionState(acao, inicial);
  const v = estado.valores ?? {};

  return (
    <form action={enviar} className="max-w-xl space-y-4">
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Decisão</legend>
        <label className="mr-4 text-sm">
          <input type="radio" name="decisao" value="DEFERIDO" defaultChecked={v.decisao === "DEFERIDO"} required /> Deferir
        </label>
        <label className="text-sm">
          <input type="radio" name="decisao" value="INDEFERIDO" defaultChecked={v.decisao === "INDEFERIDO"} /> Indeferir
        </label>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="texto">Justificativa</Label>
        <textarea
          id="texto"
          name="texto"
          required
          rows={4}
          defaultValue={v.texto ?? ""}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
        />
        <p className="text-xs text-muted-foreground">
          Quem abriu o recurso e o chefe da outra equipe recebem a decisão e esta justificativa. Se for preciso mudar o
          resultado, corrija ou anule o jogo na tela de jogos do torneio.
        </p>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Registrar decisão"}
      </Button>
    </form>
  );
}
