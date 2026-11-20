"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Opcao = {
  valor: string;
  rotulo: string;
  pedePeso?: boolean;
  pedeNaipe?: boolean; // prova individual
  faixas?: string[]; // lutas que categorizam por faixa
};

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  opcoes: Opcao[];
};

const classeSelect =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

export function FormInscrever({ acao, opcoes }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);
  const [escolhida, setEscolhida] = useState("");

  const opcao = opcoes.find((o) => o.valor === escolhida);
  const pedePeso = opcao?.pedePeso ?? false;
  const pedeNaipe = opcao?.pedeNaipe ?? false;
  const faixas = opcao?.faixas ?? [];

  return (
    <form action={enviar} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="opcao">Inscrever em</Label>
        <select
          id="opcao"
          name="opcao"
          required
          value={escolhida}
          onChange={(e) => setEscolhida(e.target.value)}
          className={classeSelect}
        >
          <option value="" disabled>Escolha a modalidade ou a equipe...</option>
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
          ))}
        </select>
      </div>

      {pedeNaipe && (
        <div className="space-y-1">
          <Label htmlFor="naipe">Naipe</Label>
          <select id="naipe" name="naipe" required defaultValue="" className={classeSelect}>
            <option value="" disabled>Escolha...</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMININO">Feminino</option>
          </select>
        </div>
      )}

      {pedePeso && (
        <div className="space-y-1">
          <Label htmlFor="peso">Peso do atleta (kg)</Label>
          <Input id="peso" name="peso" inputMode="decimal" placeholder="Ex.: 62,5" required />
          <p className="text-xs text-muted-foreground">O Staff confirma o peso na pesagem oficial.</p>
        </div>
      )}

      {faixas.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="faixa">Cor da faixa</Label>
          <select id="faixa" name="faixa" required defaultValue="" className={classeSelect}>
            <option value="" disabled>Escolha...</option>
            {faixas.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">O Staff pode corrigir na pesagem.</p>
        </div>
      )}

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Inscrevendo..." : "Inscrever"}
      </Button>
    </form>
  );
}
