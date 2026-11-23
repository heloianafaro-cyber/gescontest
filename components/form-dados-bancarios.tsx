"use client";

import { useActionState } from "react";
import { salvarDadosBancarios, type EstadoBanco } from "@/modules/dados-bancarios/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inicial: EstadoBanco = { erro: "" };

export function FormDadosBancarios({ rotuloBotao }: { rotuloBotao: string }) {
  const [estado, enviar, pendente] = useActionState(salvarDadosBancarios, inicial);
  const v = estado.valores ?? {};

  return (
    <form action={enviar} autoComplete="off" className="max-w-md space-y-4">
      <div className="space-y-1">
        <Label htmlFor="banco">Banco</Label>
        <Input id="banco" name="banco" required defaultValue={v.banco ?? ""} placeholder="Ex.: Banco do Brasil" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="tipoConta">Tipo de conta</Label>
        <select
          id="tipoConta"
          name="tipoConta"
          defaultValue={v.tipoConta ?? "CORRENTE"}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
        >
          <option value="CORRENTE">Conta corrente</option>
          <option value="POUPANCA">Poupança</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="agencia">Agência</Label>
        <Input id="agencia" name="agencia" required inputMode="numeric" defaultValue={v.agencia ?? ""} placeholder="1234 ou 1234-5" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="conta">Conta (com dígito)</Label>
        <Input id="conta" name="conta" required inputMode="numeric" defaultValue={v.conta ?? ""} placeholder="12345-6" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="titular">Nome do titular da conta</Label>
        <Input id="titular" name="titular" required defaultValue={v.titular ?? ""} />
        <p className="text-xs text-muted-foreground">
          Se você é menor de idade, a conta pode ser do seu responsável: informe o nome dele.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="ciencia" required className="mt-1" />
        <span>
          Estou ciente de que estes dados serão usados só para o pagamento previsto no evento, ficam cifrados, são vistos
          apenas pelo chefe da minha delegação e pelos coordenadores do evento, e serão apagados 30 dias após o fim do
          evento. Posso apagá-los quando quiser.
        </span>
      </label>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-green-700">Dados salvos.</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : rotuloBotao}
      </Button>
    </form>
  );
}
