"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const LIMITE_MB = 10;

// Envio de PDF com conferência no navegador (tipo e tamanho) antes de enviar.
export function FormRegulamento({
  acao,
  rotuloBotao,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  rotuloBotao: string;
}) {
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);

  function conferir(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    setPronto(false);
    if (!arquivo) {
      setErro("");
      return;
    }
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`O PDF tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB e o limite é ${LIMITE_MB} MB. Reduza o arquivo e tente de novo.`);
      e.target.value = "";
      return;
    }
    if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
      setErro("Escolha um arquivo PDF.");
      e.target.value = "";
      return;
    }
    setErro("");
    setPronto(true);
  }

  return (
    <form action={acao} className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" name="arquivo" accept="application/pdf" onChange={conferir} className="text-sm" />
        <Button type="submit" size="sm" disabled={!pronto}>{rotuloBotao}</Button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </form>
  );
}
