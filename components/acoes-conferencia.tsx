import Link from "next/link";
import type { InscritoConferencia } from "@/modules/eventos/conferencia-db";
import type { FaseConferencia } from "@/modules/eventos/conferencia";
import { decisaoPermitida, recursoPermitido, reaberturaPermitida } from "@/modules/eventos/impugnacao";
import {
  impugnarAtleta,
  bloquearAtleta,
  decidirRecurso,
  reabrirImpugnacao,
  enviarRecurso,
} from "@/modules/eventos/acoes-conferencia";
import { Button } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { FormRecurso } from "@/components/form-recurso";

const campoTexto = "w-full rounded-md border border-input bg-transparent p-2 text-sm";

// Ações do coordenador na lista de conferência.
export function AcoesCoordenador({
  eventoId,
  i,
  fase,
}: {
  eventoId: number;
  i: InscritoConferencia;
  fase: FaseConferencia;
}) {
  const s = i.impugnacao;
  return (
    <div className="max-w-xs space-y-2">
      {!s && fase !== "NAO_CONFIGURADA" && (
        <details>
          <summary className="cursor-pointer underline">Impugnar</summary>
          <form action={impugnarAtleta.bind(null, eventoId, i.id)} className="mt-2 space-y-2">
            <textarea name="motivo" required minLength={5} rows={2} placeholder="Motivo da impugnação" className={campoTexto} />
            <Button type="submit" size="sm">Impugnar</Button>
          </form>
        </details>
      )}

      {s && decisaoPermitida(s) && (
        <details>
          <summary className="cursor-pointer underline">Decidir</summary>
          {s.nomeArquivo && (
            <p className="mt-2">
              <Link href={`/coordenador/eventos/${eventoId}/conferencia/recurso/${i.id}`} className="underline" target="_blank">
                Abrir PDF do recurso
              </Link>
            </p>
          )}
          <form action={decidirRecurso.bind(null, eventoId, i.id)} className="mt-2 space-y-2">
            <textarea name="justificativa" required minLength={5} rows={2} placeholder="Justificativa da decisão" className={campoTexto} />
            <div className="flex gap-2">
              <Button type="submit" name="decisao" value="DEFERIDO" size="sm">Deferir</Button>
              <Button type="submit" name="decisao" value="INDEFERIDO" size="sm" variant="outline">Indeferir</Button>
            </div>
          </form>
        </details>
      )}

      {s && reaberturaPermitida(s) && (
        <form action={reabrirImpugnacao.bind(null, eventoId, i.id)}>
          <BotaoConfirmar mensagem="Reabrir esta impugnação?">Reabrir</BotaoConfirmar>
        </form>
      )}

      {!s?.bloqueio && (
        <details>
          <summary className="cursor-pointer underline">Bloquear</summary>
          <form action={bloquearAtleta.bind(null, eventoId, i.id)} className="mt-2 space-y-2">
            <p className="text-xs text-muted-foreground">Decisão final, sem recurso. Pode ser feita a qualquer tempo.</p>
            <textarea name="motivo" required minLength={5} rows={2} placeholder="Motivo do bloqueio" className={campoTexto} />
            <BotaoConfirmar mensagem="Bloquear este atleta? Não cabe recurso.">Bloquear</BotaoConfirmar>
          </form>
        </details>
      )}
    </div>
  );
}

// Ações do chefe de delegação: enviar o recurso quando permitido.
export function AcoesChefe({
  eventoId,
  i,
  fase,
}: {
  eventoId: number;
  i: InscritoConferencia;
  fase: FaseConferencia;
}) {
  const s = i.impugnacao;
  if (!s) return <span className="text-muted-foreground">—</span>;

  const permissao = recursoPermitido(fase, s);
  if (permissao.ok) {
    return (
      <details>
        <summary className="cursor-pointer underline">Enviar recurso</summary>
        <div className="mt-2">
          <FormRecurso acao={enviarRecurso.bind(null, eventoId, i.id)} />
        </div>
      </details>
    );
  }
  if (s.status === "IMPUGNADO" && !s.bloqueio) {
    return <span className="text-xs text-muted-foreground">{permissao.motivo}</span>;
  }
  return <span className="text-muted-foreground">—</span>;
}
