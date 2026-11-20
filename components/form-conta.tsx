"use client";

import { useActionState } from "react";
import type { EstadoConta } from "@/modules/usuarios/contas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  acao: (estado: EstadoConta, formData: FormData) => Promise<EstadoConta>;
  rotuloBotao: string;
  delegacoes?: { id: number; nome: string }[]; // se informado, a delegação é obrigatória (técnico)
};

const estiloSelect =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

export function FormConta({ acao, rotuloBotao, delegacoes }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoConta);
  const valor = (campo: string) => estado.valores?.[campo] ?? "";

  return (
    <div className="max-w-md space-y-3">
      {/* A chave muda quando a conta é criada, e isso limpa os campos. */}
      <form key={estado.criada?.senha ?? "novo"} action={enviar} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" name="nome" required defaultValue={valor("nome")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required defaultValue={valor("email")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="celular">Celular (opcional)</Label>
          <Input id="celular" name="celular" defaultValue={valor("celular")} />
        </div>
        {delegacoes && (
          <div className="space-y-1">
            <Label htmlFor="delegacaoId">Delegação</Label>
            <select
              id="delegacaoId"
              name="delegacaoId"
              required
              className={estiloSelect}
              defaultValue={valor("delegacaoId")}
            >
              <option value="" disabled>Escolha...</option>
              {delegacoes.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        )}
        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        <Button type="submit" disabled={pendente}>
          {pendente ? "Criando..." : rotuloBotao}
        </Button>
      </form>

      {estado.criada && (
        <div className="space-y-1 rounded-lg border p-3 text-sm">
          <p className="font-medium">Conta criada para {estado.criada.nome}</p>
          <p>E-mail: {estado.criada.email}</p>
          <p>
            Senha provisória: <code className="font-mono text-base">{estado.criada.senha}</code>
          </p>
          <p className="text-xs text-muted-foreground">
            Anote agora e repasse à pessoa: esta senha não será mostrada de novo. No primeiro acesso, ela será
            obrigada a trocá-la.
          </p>
        </div>
      )}
    </div>
  );
}