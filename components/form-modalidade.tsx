"use client";

import { CRITERIOS } from "@/modules/torneios/classificacao";
import { useActionState, useState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  rotuloBotao: string;
  maes?: { id: number; nome: string }[]; // modalidades-mãe do evento (RN155)
  modalidade?: {
    nome: string;
    tipo: string;
    minAtletas: number;
    maxAtletas: number;
    minEquipes?: number;
    desempateMataMata?: string | null;
    criteriosDesempate?: string[];
    prorrogacaoMin?: number | null;
    formatoPlacar: string | null;
    marcaMenorMelhor: boolean | null;
    maeId?: number | null;
    catPeso?: boolean;
    catIdade?: boolean;
    catFaixa?: boolean;
    faixas?: string[];
  };
};

const estiloSelect =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

export function FormModalidade({ acao, rotuloBotao, modalidade, maes = [] }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);

  const valor = (campo: string, padrao: string) => estado.valores?.[campo] ?? padrao;
  // Caixas de marcar: depois de um erro, vale o que a pessoa tinha marcado.
  const marcado = (campo: string, padrao: boolean) =>
    estado.valores ? estado.valores[campo] === "on" : padrao;

  const sentidoInicial =
    modalidade?.marcaMenorMelhor === true ? "menor" : modalidade?.marcaMenorMelhor === false ? "maior" : "";
  const [formato, setFormato] = useState(valor("formatoPlacar", modalidade?.formatoPlacar ?? ""));
  const [desempate, setDesempate] = useState(valor("desempateMataMata", modalidade?.desempateMataMata ?? ""));
  const [usaFaixa, setUsaFaixa] = useState(marcado("catFaixa", modalidade?.catFaixa ?? false));

  return (
    <form action={enviar} className="max-w-md space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome da modalidade ou prova</Label>
        <Input id="nome" name="nome" required defaultValue={valor("nome", modalidade?.nome ?? "")} />
        <p className="text-xs text-muted-foreground">
          Ex.: &quot;Futsal&quot;, ou, para provas de uma modalidade, &quot;Natação 100m livre&quot;.
        </p>
      </div>

      {maes.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="maeId">Pertence à modalidade (opcional)</Label>
          <select
            id="maeId"
            name="maeId"
            className={estiloSelect}
            defaultValue={valor("maeId", modalidade?.maeId ? String(modalidade.maeId) : "")}
          >
            <option value="">Nenhuma (modalidade avulsa)</option>
            {maes.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Provas da mesma modalidade contam uma só vez nos limites do evento.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="tipo">Como é disputada</Label>
        <select
          id="tipo"
          name="tipo"
          required
          className={estiloSelect}
          defaultValue={valor("tipo", modalidade?.tipo ?? "")}
        >
          <option value="" disabled>Escolha...</option>
          <option value="INDIVIDUAL">Individual (prova, equipe de 1 atleta)</option>
          <option value="COLETIVA">Em equipe (o chefe cria as equipes)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Duplas e revezamentos são &quot;em equipe&quot; aqui. Nos limites do evento, vale o tipo da modalidade-mãe.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="space-y-1">
          <Label htmlFor="minAtletas">Mínimo de atletas</Label>
          <Input
            id="minAtletas"
            name="minAtletas"
            type="number"
            min={1}
            required
            defaultValue={valor("minAtletas", String(modalidade?.minAtletas ?? 1))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maxAtletas">Máximo de atletas</Label>
          <Input
            id="maxAtletas"
            name="maxAtletas"
            type="number"
            min={1}
            required
            defaultValue={valor("maxAtletas", String(modalidade?.maxAtletas ?? 1))}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="minEquipes">Mínimo de equipes por torneio</Label>
        <Input
          id="minEquipes"
          name="minEquipes"
          type="number"
          min={2}
          required
          defaultValue={valor("minEquipes", String(modalidade?.minEquipes ?? 2))}
        />
        <p className="text-xs text-muted-foreground">
          Nas provas individuais, é o mínimo de atletas por categoria. Abaixo disso o sistema só avisa; o torneio não é bloqueado.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="formatoPlacar">Formato do resultado</Label>
        <select
          id="formatoPlacar"
          name="formatoPlacar"
          className={estiloSelect}
          value={formato}
          onChange={(e) => setFormato(e.target.value)}
        >
          <option value="">Sem placar (só colocação)</option>
          <option value="CORRIDO">Placar corrido (futsal, handebol...)</option>
          <option value="SETS">Por sets (vôlei, tênis de mesa, badminton...)</option>
          <option value="MARCA">Por marca (tempo, distância ou peso)</option>
          <option value="LUTA">Luta (judô, karatê, taekwondo...)</option>
        </select>
      </div>

      {(formato === "CORRIDO" || formato === "SETS") && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Critérios de desempate (rodízio e grupos)</p>
          <p className="text-xs text-muted-foreground">
            Os pontos da tabela vêm sempre primeiro. Os critérios abaixo desempatam, na ordem. Vale para todos os torneios
            desta modalidade. Deixe tudo em branco para usar o padrão (vitórias, saldo, a favor e confronto direto).
          </p>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="flex items-center gap-2 text-sm">
              <span className="w-24 text-muted-foreground">{n}º critério</span>
              <select
                name={`criterio${n}`}
                className={estiloSelect}
                defaultValue={valor(`criterio${n}`, modalidade?.criteriosDesempate?.[n - 1] ?? "")}
              >
                <option value="">—</option>
                {CRITERIOS.filter((c) => c.formatos.includes(formato)).map((c) => (
                  <option key={c.codigo} value={c.codigo}>{c.rotulo}</option>
                ))}
              </select>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Se o empate continuar, o coordenador decide a ordem à mão na tela de classificação.
          </p>
        </div>
      )}

      {formato === "CORRIDO" && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="desempateMataMata">Empate no mata-mata (opcional)</Label>
            <select
              id="desempateMataMata"
              name="desempateMataMata"
              className={estiloSelect}
              value={desempate}
              onChange={(e) => setDesempate(e.target.value)}
            >
              <option value="">Sem regra (o vencedor é informado à mão)</option>
              <option value="PENALTIS">Disputa de pênaltis</option>
              <option value="PRORROGACAO_PENALTIS">Prorrogação e, se persistir, pênaltis</option>
            </select>
            <p className="text-xs text-muted-foreground">Depende do regulamento de cada modalidade.</p>
          </div>
          {desempate === "PRORROGACAO_PENALTIS" && (
            <div className="space-y-1">
              <Label htmlFor="prorrogacaoMin">Duração da prorrogação (minutos)</Label>
              <Input
                id="prorrogacaoMin"
                name="prorrogacaoMin"
                type="number"
                min={1}
                defaultValue={valor("prorrogacaoMin", String(modalidade?.prorrogacaoMin ?? ""))}
              />
            </div>
          )}
        </div>
      )}

      {formato === "MARCA" && (
        <div className="space-y-1">
          <Label htmlFor="sentidoMarca">Qual marca é a melhor?</Label>
          <select
            id="sentidoMarca"
            name="sentidoMarca"
            className={estiloSelect}
            defaultValue={valor("sentidoMarca", sentidoInicial)}
          >
            <option value="">Escolha...</option>
            <option value="menor">O menor valor (tempo: corrida, natação)</option>
            <option value="maior">O maior valor (distância, peso levantado)</option>
          </select>
        </div>
      )}

      {formato === "LUTA" && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">As categorias da luta são formadas por:</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="catPeso" defaultChecked={marcado("catPeso", modalidade?.catPeso ?? true)} />
            Peso
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="catIdade" defaultChecked={marcado("catIdade", modalidade?.catIdade ?? false)} />
            Idade (pelo ano de nascimento)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="catFaixa"
              checked={usaFaixa}
              onChange={(e) => setUsaFaixa(e.target.checked)}
            />
            Faixa (cor da faixa)
          </label>
          {usaFaixa && (
            <div className="space-y-1">
              <Label htmlFor="faixas">Cores de faixa, da mais baixa à mais alta</Label>
              <Input
                id="faixas"
                name="faixas"
                defaultValue={valor("faixas", (modalidade?.faixas ?? []).join(", "))}
                placeholder="branca, amarela, laranja, verde, azul, roxa, marrom, preta"
              />
              <p className="text-xs text-muted-foreground">Separe por vírgula. O atleta escolhe a dele na inscrição.</p>
            </div>
          )}
        </div>
      )}

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : rotuloBotao}
      </Button>
    </form>
  );
}
