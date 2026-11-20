"use client";

import { useActionState } from "react";
import type { EstadoConta } from "@/modules/usuarios/contas";
import { Button } from "@/components/ui/button";

type Props = {
  acao: (estado: EstadoConta, formData: FormData) => Promise<EstadoConta>;
  usuarioId: number;
};

export function FormRedefinir({ acao, usuarioId }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoConta);

  return (
    <form action={enviar} className="space-y-1">
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <Button
        type="submit"
        variant="outline"
        disabled={pendente}
        onClick={(e) => {
          if (!window.confirm("Gerar uma nova senha provisória? A senha atual deixa de funcionar.")) {
            e.preventDefault();
          }
        }}
      >
        Nova senha provisória
      </Button>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.criada && (
        <p className="text-sm">
          Nova senha: <code className="font-mono text-base">{estado.criada.senha}</code>{" "}
          <span className="text-xs text-muted-foreground">(anote agora; não será mostrada de novo)</span>
        </p>
      )}
    </form>
  );
}