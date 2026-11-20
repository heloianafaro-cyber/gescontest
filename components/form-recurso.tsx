"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const LIMITE_MB = 10;

// Recurso do chefe de delegação: texto obrigatório e PDF opcional (conferido no navegador).
export function FormRecurso({ acao }: { acao: (formData: FormData) => void | Promise<void> }) {
  const [erro, setErro] = useState("");

  function conferir(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) {
      setErro("");
      return;
    }
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`O PDF tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB e o limite é ${LIMITE_MB} MB.`);
      e.target.value = "";
      return;
    }
    if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
      setErro("Escolha um arquivo PDF.");
      e.target.value = "";
      return;
    }
    setErro("");
  }

  return (
    <form action={acao} className="max-w-xs space-y-2">
      <textarea
        name="texto"
        required
        minLength={10}
        rows={3}
        placeholder="Explique o que foi regularizado ou o motivo do recurso"
        className="w-full rounded-md border border-input bg-transparent p-2 text-sm"
      />
      <input type="file" name="arquivo" accept="application/pdf" onChange={conferir} className="text-sm" />
      <p className="text-xs text-muted-foreground">Anexo em PDF opcional, até {LIMITE_MB} MB.</p>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" size="sm">Enviar recurso</Button>
    </form>
  );
}
