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
      <section className="space-y-2 rounded-md border bg-muted p-4 text-sm">
        <p className="font-medium">Como escrever o recurso</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Os fatos:</strong> descreva o que aconteceu, em que momento do jogo (tempo, minuto, set, round ou
            bateria) e quem estava envolvido (equipe, função, sem citar dados pessoais dos atletas).
          </li>
          <li>
            <strong>A regra:</strong> se possível, indique o item do regulamento do evento ou da modalidade que você entende
            que não foi cumprido.
          </li>
          <li>
            <strong>O pedido:</strong> diga com clareza o que você pede diante dos fatos (por exemplo: rever o resultado,
            repetir o jogo, anular a partida, corrigir o placar ou a classificação).
          </li>
          <li>
            <strong>As provas:</strong> fotos e vídeos ajudam muito. Coloque numa pasta do Google Drive, libere o acesso a
            quem tem o link e cole o endereço no campo abaixo.
          </li>
          <li>
            <strong>Tom:</strong> seja objetivo e respeitoso, sem ofensas à arbitragem, à organização ou a outras equipes.
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Cada equipe pode abrir um recurso por jogo, dentro do prazo do evento. Quem decide é o coordenador, e você será
          avisado da decisão. Abrir o recurso não muda o resultado por si só. Até a decisão, siga as orientações da
          organização.
        </p>
      </section>

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
          placeholder={"Fatos: o que aconteceu e em que momento.\nRegra: item do regulamento (se souber).\nPedido: o que você solicita."}
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
