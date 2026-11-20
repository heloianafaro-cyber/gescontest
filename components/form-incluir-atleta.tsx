"use client";

import { useActionState } from "react";
import { incluirAtleta } from "@/modules/equipes/acoes-atletas";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormIncluirAtleta() {
  const [estado, enviar, pendente] = useActionState(incluirAtleta, { erro: "" } as EstadoForm);

  return (
    <form action={enviar} className="max-w-md space-y-3">
      <div className="space-y-1">
        <Label htmlFor="busca">E-mail ou matrícula do atleta</Label>
        <Input id="busca" name="busca" required defaultValue={estado.valores?.busca ?? ""} />
        <p className="text-xs text-muted-foreground">
          O atleta precisa ter feito o cadastro e não estar em outra delegação.
        </p>
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Incluindo..." : "Incluir na minha delegação"}
      </Button>
    </form>
  );
}