"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estiloSelect =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  equipeA: string;
  equipeB: string;
  formato: string | null; // CORRIDO | SETS | LUTA
  mataMata: boolean;
  setsParaVencer: number | null;
  desempate: string | null;
  prorrogacaoMin: number | null;
  formas: { valor: string; rotulo: string }[];
  status: string;
  podeAnular: boolean;
  inicial: Record<string, string>; // valores já gravados (para corrigir)
  termo: string; // "jogo" ou "combate"
};

export function FormResultado(p: Props) {
  const [estado, enviar, pendente] = useActionState(p.acao, { erro: "" } as EstadoForm);
  const v = (campo: string) => estado.valores?.[campo] ?? p.inicial[campo] ?? "";
  const maxSets = p.setsParaVencer ? p.setsParaVencer * 2 - 1 : 0;
  const fechado = p.status === "ENCERRADA" || p.status === "WO";
  const [forma, setForma] = useState(v("forma"));
  const podeLimpar = fechado || p.status === "EM_ANDAMENTO" || p.status === "ANULADA";

  return (
    <form action={enviar} className="max-w-lg space-y-5">
      {p.formato === "CORRIDO" && (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="placarA">{p.equipeA}</Label>
              <Input id="placarA" name="placarA" type="number" min={0} defaultValue={v("placarA")} className="w-24" />
            </div>
            <span className="pb-2">x</span>
            <div className="space-y-1">
              <Label htmlFor="placarB">{p.equipeB}</Label>
              <Input id="placarB" name="placarB" type="number" min={0} defaultValue={v("placarB")} className="w-24" />
            </div>
          </div>

          {p.desempate === "PRORROGACAO_PENALTIS" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="prorrogacao" defaultChecked={v("prorrogacao") === "on"} />
              Foi para a prorrogação{p.prorrogacaoMin ? ` (${p.prorrogacaoMin} min)` : ""}; o placar acima já a inclui
            </label>
          )}

          {p.mataMata && (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">
                {p.desempate ? "Se terminar empatado: pênaltis" : "Se terminar empatado: informe o vencedor"}
              </p>
              {p.desempate && (
                <div className="flex items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="penaltisA">Pênaltis {p.equipeA}</Label>
                    <Input id="penaltisA" name="penaltisA" type="number" min={0} defaultValue={v("penaltisA")} className="w-24" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="penaltisB">Pênaltis {p.equipeB}</Label>
                    <Input id="penaltisB" name="penaltisB" type="number" min={0} defaultValue={v("penaltisB")} className="w-24" />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="vencedorDesempate">Vencedor do desempate</Label>
                <select id="vencedorDesempate" name="vencedorDesempate" className={estiloSelect} defaultValue={v("vencedorDesempate")}>
                  <option value="">—</option>
                  <option value="A">{p.equipeA}</option>
                  <option value="B">{p.equipeB}</option>
                </select>
                {p.desempate && (
                  <p className="text-xs text-muted-foreground">
                    Com o placar dos pênaltis preenchido, o vencedor é calculado sozinho (opcional).
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {p.formato === "SETS" && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Placar de cada set ({p.equipeA} x {p.equipeB}) — melhor de {maxSets}
          </p>
          {Array.from({ length: maxSets }, (_, i) => i + 1).map((n) => (
            <div key={n} className="flex items-center gap-2 text-sm">
              <span className="w-12 text-muted-foreground">Set {n}</span>
              <Input name={`set${n}A`} type="number" min={0} defaultValue={v(`set${n}A`)} className="w-20" />
              <span>x</span>
              <Input name={`set${n}B`} type="number" min={0} defaultValue={v(`set${n}B`)} className="w-20" />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Deixe em branco os sets que não foram disputados.</p>
        </div>
      )}

      {p.formato === "LUTA" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="vencedorLuta">Vencedor</Label>
            <select id="vencedorLuta" name="vencedorLuta" className={estiloSelect} defaultValue={v("vencedorLuta")}>
              <option value="">Escolha...</option>
              <option value="A">{p.equipeA}</option>
              <option value="B">{p.equipeB}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="forma">Forma da vitória</Label>
            <select id="forma" name="forma" className={estiloSelect} value={forma} onChange={(e) => setForma(e.target.value)}>
              <option value="">Escolha...</option>
              {p.formas.map((f) => (
                <option key={f.valor} value={f.valor}>{f.rotulo}</option>
              ))}
            </select>
          </div>
          {forma === "PONTOS" && (
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="placarA">Pontos {p.equipeA}</Label>
                <Input id="placarA" name="placarA" type="number" min={0} defaultValue={v("placarA")} className="w-24" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="placarB">Pontos {p.equipeB}</Label>
                <Input id="placarB" name="placarB" type="number" min={0} defaultValue={v("placarB")} className="w-24" />
              </div>
            </div>
          )}
        </div>
      )}

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="acao" value="encerrar" disabled={pendente}>
          {fechado ? "Salvar correção" : `Encerrar ${p.termo}`}
        </Button>
        {podeLimpar && (
          <Button
            type="submit"
            name="acao"
            value="limpar"
            variant="outline"
            disabled={pendente}
            onClick={(e) => {
              if (!window.confirm(`Limpar o resultado e voltar o ${p.termo} para "agendado"?`)) e.preventDefault();
            }}
          >
            Limpar resultado
          </Button>
        )}
        {p.status === "AGENDADA" && (
          <Button type="submit" name="acao" value="iniciar" variant="outline" disabled={pendente}>
            Marcar como em andamento
          </Button>
        )}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">W.O.</p>
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="woLado">Quem deu W.O.?</Label>
            <select id="woLado" name="woLado" className={estiloSelect} defaultValue={v("woLado")}>
              <option value="">Escolha...</option>
              <option value="A">{p.equipeA}</option>
              <option value="B">{p.equipeB}</option>
            </select>
          </div>
          <Button type="submit" name="acao" value="wo" variant="outline" disabled={pendente}>
            Registrar W.O.
          </Button>
        </div>
      </div>

      {p.podeAnular && (
        <div className="space-y-2 rounded-lg border border-red-200 p-3">
          <p className="text-sm font-medium">Anular partida (só coordenador)</p>
          <div className="space-y-1">
            <Label htmlFor="motivo">Motivo</Label>
            <Input id="motivo" name="motivo" defaultValue={v("motivo")} placeholder="Ex.: equipe irregular, erro de súmula" />
          </div>
          <Button type="submit" name="acao" value="anular" variant="outline" disabled={pendente}>
            Anular partida
          </Button>
        </div>
      )}
    </form>
  );
}
