"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Mostra as opções de um calendário: baixar o arquivo, abrir no app de agenda e copiar o link de assinatura.
export function LinkAgenda({ caminho, rotulo }: { caminho: string; rotulo: string }) {
  const [origem, setOrigem] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setOrigem(window.location.origin);
  }, []);

  const url = `${origem}${caminho}`;
  const webcal = origem ? url.replace(/^https?:/, "webcal:") : "#";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="min-w-40 font-medium">{rotulo}</span>
      <a href={`${caminho}?baixar=1`} className="underline">Baixar .ics</a>
      <a href={webcal} className="underline">Abrir na agenda</a>
      <Button type="button" variant="outline" size="sm" onClick={copiar}>
        {copiado ? "Link copiado" : "Copiar link"}
      </Button>
    </div>
  );
}
