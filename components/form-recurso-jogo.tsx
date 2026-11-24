"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inicial: EstadoForm = { erro: "" };

export function FormRecursoJogo({ acao }: { acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm> }) {
  const [estado, enviar, pendente] = useActionState(acao, inicial);
  const v = estado.valores ?? {};

  return (
    <form action={enviar} className="max-w-xl space-y-4">
      <div className="space-y-1">
        <Label htmlFor="assunto">Assunto</Label>
        <select
          id="assunto"
          name="assunto"
          defaultValue={v.assunto ?? "ARBITRAGEM"}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
        >
          <option value="ARBITRAGEM">Atuação da arbitragem</option>
          <option value="ORGANIZACAO">Organização da prova ou do jogo</option>
          <option value="OUTRO">Outro</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="texto">O que você contesta</Label>
        <textarea
          id="texto"
          name="texto"
          required
          rows={6}
          defaultValue={v.texto ?? ""}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
          placeholder="Descreva o lance ou a situação, o momento do jogo e o que você pede."
        />
        <p className="text-xs text-muted-foreground">Mínimo de 20 caracteres.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="link">Link com fotos ou vídeos (opcional)</Label>
        <Input id="link" name="link" type="url" defaultValue={v.link ?? ""} placeholder="https://drive.google.com/..." />
        <p className="text-xs text-muted-foreground">
          O sistema não guarda fotos nem vídeos. Coloque as provas numa pasta do Google Drive, deixe o acesso como
          &quot;qualquer pessoa com o link pode ver&quot; e cole o link aqui.
        </p>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Enviando..." : "Abrir recurso"}
      </Button>
    </form>
  );
}
