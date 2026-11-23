"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EventoExistente = {
  nome: string;
  dataInicio: Date;
  dataFim: Date;
  inscricaoInicio?: Date | null;
  inscricaoFim?: Date | null;
  conferenciaInicio?: Date | null;
  conferenciaFim?: Date | null;
  recursoFim?: Date | null;
  pesoExcedente?: "SUBIR_CATEGORIA" | "ELIMINAR";
  pedeDadosBancarios?: boolean;
  idadeLimite: number | null;
  maxModTotal: number | null;
  maxModInd: number | null;
  maxModCol: number | null;
};

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  rotuloBotao: string;
  evento?: EventoExistente;
};

const campos = [
  ["nome", "Nome do evento", "text", true, ""],
  ["dataInicio", "Data de início", "date", true, ""],
  ["dataFim", "Data de término", "date", true, ""],
  ["inscricaoInicio", "Início das inscrições (opcional)", "date", false, "Em branco = sem prazo definido"],
  ["inscricaoFim", "Fim das inscrições (opcional)", "date", false, "Inscrições aceitas até o fim deste dia. O coordenador pode prorrogar editando a data."],
  ["conferenciaInicio", "Início da conferência (opcional)", "date", false, "Em branco = evento sem conferência. Só pode começar depois do fim das inscrições."],
  ["conferenciaFim", "Fim da conferência", "date", false, "Obrigatório se houver início. Até este dia, atleta ou chefe de delegação regulariza as pendências."],
  ["recursoFim", "Fim do prazo de recurso (opcional)", "date", false, "Em branco = recursos só durante a conferência. O sorteio só é liberado depois da conferência e dos recursos."],
  ["idadeLimite", "Idade limite (opcional)", "number", false, "Conta só o ano de nascimento"],
  ["maxModTotal", "Máximo de modalidades por atleta (opcional)", "number", false, "Em branco = sem limite"],
  ["maxModInd", "Máximo de provas individuais (opcional)", "number", false, "Em branco = sem limite"],
  ["maxModCol", "Máximo de modalidades coletivas (opcional)", "number", false, "Em branco = sem limite"],
] as const;

const inicial: EstadoForm = { erro: "" };

function dataParaCampo(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function FormEvento({ acao, rotuloBotao, evento }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, inicial);

  const padrao: Record<string, string> = evento
    ? {
        nome: evento.nome,
        dataInicio: dataParaCampo(evento.dataInicio),
        dataFim: dataParaCampo(evento.dataFim),
        inscricaoInicio: dataParaCampo(evento.inscricaoInicio),
        inscricaoFim: dataParaCampo(evento.inscricaoFim),
        conferenciaInicio: dataParaCampo(evento.conferenciaInicio),
        conferenciaFim: dataParaCampo(evento.conferenciaFim),
        recursoFim: dataParaCampo(evento.recursoFim),
        idadeLimite: evento.idadeLimite?.toString() ?? "",
        maxModTotal: evento.maxModTotal?.toString() ?? "",
        maxModInd: evento.maxModInd?.toString() ?? "",
        maxModCol: evento.maxModCol?.toString() ?? "",
      }
    : {};

  const pesoExcedente = estado.valores?.pesoExcedente ?? evento?.pesoExcedente ?? "SUBIR_CATEGORIA";

  return (
    <form action={enviar} className="max-w-md space-y-4">
      {campos.map(([nome, rotulo, tipo, obrigatorio, dica]) => (
        <div key={nome} className="space-y-1">
          <Label htmlFor={nome}>{rotulo}</Label>
          <Input
            id={nome}
            name={nome}
            type={tipo}
            required={obrigatorio}
            min={tipo === "number" ? 1 : undefined}
            defaultValue={estado.valores?.[nome] ?? padrao[nome]}
          />
          {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
        </div>
      ))}

      <div className="space-y-1">
        <Label htmlFor="pesoExcedente">Atleta acima do limite de peso (lutas)</Label>
        <select
          id="pesoExcedente"
          name="pesoExcedente"
          defaultValue={pesoExcedente}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
        >
          <option value="SUBIR_CATEGORIA">Pode se inscrever na categoria de peso acima</option>
          <option value="ELIMINAR">É eliminado da categoria</option>
        </select>
        <p className="text-xs text-muted-foreground">Vale para a pesagem. Siga o regulamento da competição.</p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="pedeDadosBancarios"
          defaultChecked={estado.valores ? estado.valores.pedeDadosBancarios === "on" : (evento?.pedeDadosBancarios ?? false)}
          className="mt-1"
        />
        <span>
          Pedir dados bancários dos atletas (ex.: pagamento de bolsas)
          <span className="block text-xs text-muted-foreground">
            Opcional. Os dados ficam cifrados e só o chefe da delegação do atleta e os coordenadores deste evento os veem.
          </span>
        </span>
      </label>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : rotuloBotao}
      </Button>
    </form>
  );
}
