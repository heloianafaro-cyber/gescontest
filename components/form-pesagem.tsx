"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  pedePeso: boolean;
  peso: string;
  faixas: string[]; // vazio = a modalidade não usa faixa
  faixa: string;
  absolutos: { id: number; nome: string; marcado: boolean }[];
  confirmado: boolean;
};

export function FormPesagem({ acao, pedePeso, peso, faixas, faixa, absolutos, confirmado }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);

  return (
    <form action={enviar} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {pedePeso && (
          <div className="space-y-1">
            <Label htmlFor="peso">Peso oficial (kg)</Label>
            <Input id="peso" name="peso" inputMode="decimal" defaultValue={peso} className="w-32" required />
          </div>
        )}
        {faixas.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="faixa">Faixa</Label>
            <select
              id="faixa"
              name="faixa"
              required
              defaultValue={faixa}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
            >
              <option value="" disabled>Escolha...</option>
              {faixas.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {absolutos.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Absoluto</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {absolutos.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="absoluto" value={a.id} defaultChecked={a.marcado} />
                {a.nome}
              </label>
            ))}
          </div>
        </div>
      )}

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {!estado.erro && estado.valores?.ok === "salvo" && (
        <p className="text-sm text-green-700">
          Pesagem salva{estado.valores.categoria ? ` · categoria: ${estado.valores.categoria}` : " · sem categoria"}.
        </p>
      )}
      {!estado.erro && estado.valores?.ok === "eliminado" && (
        <p className="text-sm text-red-600">Atleta eliminado desta prova (peso acima do limite). Recarregue a página.</p>
      )}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : confirmado ? "Salvar novamente" : "Confirmar pesagem"}
      </Button>
    </form>
  );
}
