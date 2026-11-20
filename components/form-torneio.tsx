"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import {
  sistemasDoFormato,
  VARIANTES_ELIMINATORIO,
  TERCEIRO_LUGAR,
} from "@/modules/eventos/schemas-estrutura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TorneioForm = Record<string, string>;

export type ConfigCategoria = { catPeso: boolean; catIdade: boolean; catFaixa: boolean; faixas: string[] };

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  rotuloBotao: string;
  formato: string | null; // formato do placar da modalidade
  config?: ConfigCategoria; // critérios de categoria das lutas (RN157)
  torneio?: TorneioForm; // valores atuais, como texto
};

const estiloSelect =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

const configPadrao: ConfigCategoria = { catPeso: true, catIdade: false, catFaixa: false, faixas: [] };

function Numero({
  campo,
  rotulo,
  valor,
  dica,
  passo,
}: {
  campo: string;
  rotulo: string;
  valor: string;
  dica?: string;
  passo?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={campo}>{rotulo}</Label>
      <Input id={campo} name={campo} type="number" min={0} step={passo} defaultValue={valor} />
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  );
}

export function FormTorneio({ acao, rotuloBotao, formato, config = configPadrao, torneio }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: "" } as EstadoForm);

  const valor = (campo: string, padrao: string) =>
    estado.valores?.[campo] ?? torneio?.[campo] ?? padrao;

  const sistemas = sistemasDoFormato(formato);
  const [sistema, setSistema] = useState(
    valor("sistemaDisputa", sistemas.length === 1 ? sistemas[0].valor : "")
  );
  const [variante, setVariante] = useState(valor("variante", "SIMPLES"));
  const [serie, setSerie] = useState(valor("jogosPorSerie", ""));
  const [absoluto, setAbsoluto] = useState(valor("absoluto", "") === "on");
  const [faixasEscolhidas, setFaixasEscolhidas] = useState<string[]>(
    valor("faixas", "").split(",").map((f) => f.trim()).filter(Boolean)
  );

  function alternarFaixa(faixa: string, marcada: boolean) {
    setFaixasEscolhidas((atual) => (marcada ? [...atual, faixa] : atual.filter((f) => f !== faixa)));
  }

  const comPlacar = formato === "CORRIDO" || formato === "SETS";
  const rodizio = sistema === "RODIZIO";
  const eliminatorio = sistema === "ELIMINATORIO";
  const misto = sistema === "MISTO";
  const mataMata = eliminatorio || misto;
  const pontua = comPlacar && (rodizio || misto);
  const mostraTerceiro = mataMata && !(eliminatorio && variante === "REPESCAGEM");
  const nenhumCriterio = !config.catPeso && !config.catIdade && !config.catFaixa;

  return (
    <form action={enviar} className="max-w-md space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome do torneio</Label>
        <Input id="nome" name="nome" required defaultValue={valor("nome", "")} />
        <p className="text-xs text-muted-foreground">
          {formato === "LUTA"
            ? "Cada categoria é um torneio. Ex.: Masculino -66kg, Feminino -52kg, Absoluto."
            : "Ex.: Masculino sub-15, Feminino livre."}
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="naipe">Naipe (opcional)</Label>
        <select id="naipe" name="naipe" className={estiloSelect} defaultValue={valor("naipe", "")}>
          <option value="">Sem separação por naipe</option>
          <option value="MASCULINO">Masculino</option>
          <option value="FEMININO">Feminino</option>
          <option value="MISTO">Misto</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Usado para colocar atletas e equipes automaticamente na categoria certa.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="sistemaDisputa">Sistema de disputa</Label>
        <select
          id="sistemaDisputa"
          name="sistemaDisputa"
          required
          className={estiloSelect}
          value={sistema}
          onChange={(e) => setSistema(e.target.value)}
        >
          <option value="" disabled>Escolha...</option>
          {sistemas.map((s) => (
            <option key={s.valor} value={s.valor}>{s.rotulo}</option>
          ))}
        </select>
      </div>

      {rodizio && (
        <div className="space-y-1">
          <Label htmlFor="turnos">Turnos</Label>
          <select id="turnos" name="turnos" className={estiloSelect} defaultValue={valor("turnos", "1")}>
            <option value="1">Turno simples (todos se enfrentam uma vez)</option>
            <option value="2">Turno e returno (todos se enfrentam duas vezes)</option>
          </select>
        </div>
      )}

      {eliminatorio && (
        <div className="space-y-1">
          <Label htmlFor="variante">Tipo de eliminatória</Label>
          <select
            id="variante"
            name="variante"
            className={estiloSelect}
            value={variante}
            onChange={(e) => setVariante(e.target.value)}
          >
            {VARIANTES_ELIMINATORIO.filter((v) => v.valor !== "REPESCAGEM" || formato === "LUTA").map((v) => (
              <option key={v.valor} value={v.valor}>{v.rotulo}</option>
            ))}
          </select>
        </div>
      )}

      {misto && (
        <div className="flex gap-3">
          <Numero campo="chaves" rotulo="Quantidade de grupos" valor={valor("chaves", "2")} />
          <Numero
            campo="classificadosPorGrupo"
            rotulo="Classificados por grupo"
            valor={valor("classificadosPorGrupo", "2")}
          />
        </div>
      )}

      {mostraTerceiro && (
        <div className="space-y-1">
          <Label htmlFor="terceiroLugar">Terceiro lugar</Label>
          <select
            id="terceiroLugar"
            name="terceiroLugar"
            className={estiloSelect}
            defaultValue={valor("terceiroLugar", "DISPUTA_3LUGAR")}
          >
            {TERCEIRO_LUGAR.map((t) => (
              <option key={t.valor} value={t.valor}>{t.rotulo}</option>
            ))}
          </select>
        </div>
      )}

      {mataMata && formato !== "LUTA" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="jogosPorSerie">Jogos por confronto</Label>
            <select
              id="jogosPorSerie"
              name="jogosPorSerie"
              className={estiloSelect}
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
            >
              <option value="">Jogo único</option>
              <option value="3">Play-off: melhor de 3 jogos</option>
              <option value="5">Play-off: melhor de 5 jogos</option>
              <option value="7">Play-off: melhor de 7 jogos</option>
            </select>
          </div>
          {serie && (
            <div className="space-y-1">
              <Label htmlFor="jogosPorSerieFinal">Jogos por confronto na final</Label>
              <select
                id="jogosPorSerieFinal"
                name="jogosPorSerieFinal"
                className={estiloSelect}
                defaultValue={valor("jogosPorSerieFinal", "")}
              >
                <option value="">Igual às demais fases</option>
                <option value="3">Melhor de 3 jogos</option>
                <option value="5">Melhor de 5 jogos</option>
                <option value="7">Melhor de 7 jogos</option>
              </select>
            </div>
          )}
        </div>
      )}

      {pontua && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pontos na tabela</p>
          <div className="flex gap-3">
            <Numero campo="pontosVit" rotulo="Vitória" valor={valor("pontosVit", "3")} />
            <Numero campo="pontosEmp" rotulo="Empate" valor={valor("pontosEmp", "1")} />
            <Numero campo="pontosDer" rotulo="Derrota" valor={valor("pontosDer", "0")} />
          </div>
        </div>
      )}

      {formato === "SETS" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Sets</p>
          <div className="space-y-1">
            <Label htmlFor="setsParaVencer">Formato da partida</Label>
            <select
              id="setsParaVencer"
              name="setsParaVencer"
              className={estiloSelect}
              defaultValue={valor("setsParaVencer", "2")}
            >
              <option value="2">Melhor de 3 (vence com 2 sets)</option>
              <option value="3">Melhor de 5 (vence com 3 sets)</option>
              <option value="4">Melhor de 7 (vence com 4 sets)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Numero campo="pontosPorSet" rotulo="Pontos por set" valor={valor("pontosPorSet", "25")} />
            <Numero campo="pontosSetDecisivo" rotulo="Set decisivo" valor={valor("pontosSetDecisivo", "15")} />
          </div>
          <Numero
            campo="diferencaMinima"
            rotulo="Diferença mínima para fechar o set"
            valor={valor("diferencaMinima", "2")}
            dica="Ex.: 2 pontos de vantagem. Deixe vazio se não houver."
          />
        </div>
      )}

      {comPlacar && (
        <div className="space-y-2">
          <p className="text-sm font-medium">W.O. (resultado atribuído)</p>
          <div className="flex gap-3">
            <Numero
              campo="woPlacarVencedor"
              rotulo={formato === "SETS" ? "Sets do vencedor" : "Gols do vencedor"}
              valor={valor("woPlacarVencedor", formato === "SETS" ? "2" : "1")}
            />
            <Numero campo="woPlacarPerdedor" rotulo="Do perdedor" valor={valor("woPlacarPerdedor", "0")} />
          </div>
          {formato === "SETS" && (
            <Numero
              campo="woPontosSetVencedor"
              rotulo="Pontos do vencedor em cada set"
              valor={valor("woPontosSetVencedor", "25")}
            />
          )}
        </div>
      )}

      {formato === "LUTA" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="absoluto"
              checked={absoluto}
              onChange={(e) => setAbsoluto(e.target.checked)}
            />
            Torneio absoluto (sem limite de peso)
          </label>
          {absoluto && (
            <p className="text-xs text-muted-foreground">
              Quem participa do absoluto é definido na pesagem, entre os atletas inscritos na modalidade que atendem
              às restrições abaixo (se houver). Você pode criar vários absolutos.
            </p>
          )}
          <div className="space-y-4">
            {nenhumCriterio && !absoluto && (
              <p className="text-xs text-muted-foreground">
                Esta modalidade não separa categorias por peso, idade ou faixa. Para mudar, edite a modalidade.
              </p>
            )}

            {config.catPeso && !absoluto && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Faixa de peso da categoria (kg)</p>
                <div className="flex gap-3">
                  <Numero campo="pesoMin" rotulo="Peso mínimo" valor={valor("pesoMin", "")} passo="0.1" dica="Vazio = sem mínimo" />
                  <Numero campo="pesoMax" rotulo="Peso máximo" valor={valor("pesoMax", "")} passo="0.1" dica="Vazio = sem máximo" />
                </div>
              </div>
            )}

            {config.catIdade && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {absoluto ? "Restrição de idade (anos, opcional)" : "Faixa de idade da categoria (anos)"}
                </p>
                <div className="flex gap-3">
                  <Numero campo="idadeMin" rotulo="Idade mínima" valor={valor("idadeMin", "")} dica="Vazio = sem mínimo" />
                  <Numero campo="idadeMax" rotulo="Idade máxima" valor={valor("idadeMax", "")} dica="Vazio = sem máximo" />
                </div>
                <p className="text-xs text-muted-foreground">Idade contada pelo ano de nascimento.</p>
              </div>
            )}

            {config.catFaixa && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {absoluto ? "Faixas aceitas no absoluto (opcional)" : "Faixas aceitas na categoria"}
                </p>
                {config.faixas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Cadastre as cores de faixa editando a modalidade.</p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {config.faixas.map((f) => (
                      <label key={f} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={faixasEscolhidas.includes(f)}
                          onChange={(e) => alternarFaixa(f, e.target.checked)}
                        />
                        {f}
                      </label>
                    ))}
                  </div>
                )}
                {/* O servidor recebe a lista como texto, separada por vírgula. */}
                <input type="hidden" name="faixas" value={faixasEscolhidas.join(",")} />
                <p className="text-xs text-muted-foreground">Nenhuma marcada = aceita todas as faixas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(comPlacar || formato === "LUTA") && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {formato === "LUTA" ? "Tempo das lutas" : "Duração dos jogos"}
          </p>
          {formato === "CORRIDO" ? (
            <>
              <div className="flex gap-3">
                <Numero campo="numTempos" rotulo="Tempos" valor={valor("numTempos", "2")} />
                <Numero campo="duracaoTempoMin" rotulo="Minutos por tempo" valor={valor("duracaoTempoMin", "20")} />
                <Numero campo="intervaloTemposMin" rotulo="Intervalo (min)" valor={valor("intervaloTemposMin", "5")} />
              </div>
              <p className="text-xs text-muted-foreground">
                Jogos escolares costumam ser mais curtos. Ex.: futsal com 2 tempos de 15 minutos. A duração total é calculada.
              </p>
            </>
          ) : (
            <Numero
              campo="duracaoJogoMin"
              rotulo={formato === "LUTA" ? "Tempo estimado de cada luta (min)" : "Duração estimada de cada jogo (min)"}
              valor={valor("duracaoJogoMin", formato === "LUTA" ? "6" : "30")}
              dica={
                formato === "LUTA"
                  ? "Tempo limite da luta, incluindo rounds e descansos. Usado para montar a agenda."
                  : "Usada para montar a agenda."
              }
            />
          )}
          <Numero
            campo="intervaloJogosMin"
            rotulo={
              formato === "LUTA"
                ? "Intervalo entre uma luta e a seguinte (min)"
                : "Intervalo entre um jogo e o seguinte (min)"
            }
            valor={valor("intervaloJogosMin", "10")}
            dica={
              formato === "LUTA"
                ? "Folga no mesmo tatame ou ringue (troca de lutadores, arbitragem)."
                : "Folga no mesmo local (aquecimento, troca de equipes)."
            }
          />
        </div>
      )}

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : rotuloBotao}
      </Button>
    </form>
  );
}
