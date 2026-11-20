"use client";

import { useActionState } from "react";
import { trocarSenhaInicial, type EstadoSenha } from "@/modules/usuarios/acoes-senha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormTrocarSenha() {
  const [estado, enviar, pendente] = useActionState(trocarSenhaInicial, { erro: "" } as EstadoSenha);

  return (
    <form action={enviar} className="max-w-md space-y-3">
      <div className="space-y-1">
        <Label htmlFor="senhaAtual">Senha provisória</Label>
        <Input id="senhaAtual" name="senhaAtual" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="novaSenha">Nova senha</Label>
        <Input id="novaSenha" name="novaSenha" type="password" autoComplete="new-password" required />
        <p className="text-xs text-muted-foreground">Pelo menos 8 caracteres.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirmacao">Repita a nova senha</Label>
        <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Trocar senha"}
      </Button>
    </form>
  );
}