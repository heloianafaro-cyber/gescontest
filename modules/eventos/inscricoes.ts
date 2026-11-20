import { hojeISO } from "@/modules/usuarios/idade";

type PrazoEvento = {
  inscricaoInicio: Date | null;
  inscricaoFim: Date | null;
  dataFim: Date;
};

const dia = (d: Date) => d.toISOString().slice(0, 10);
const br = (iso: string) => iso.split("-").reverse().join("/");

// RN151: sem prazo definido, as inscrições ficam abertas até o fim do evento.
// O dia do fim das inscrições ainda conta como aberto.
export function situacaoInscricao(e: PrazoEvento): { aberta: boolean; motivo: string } {
  const hoje = hojeISO();
  if (e.inscricaoInicio && hoje < dia(e.inscricaoInicio)) {
    return { aberta: false, motivo: `As inscrições abrem em ${br(dia(e.inscricaoInicio))}.` };
  }
  const limite = dia(e.inscricaoFim ?? e.dataFim);
  if (hoje > limite) {
    return { aberta: false, motivo: `As inscrições terminaram em ${br(limite)}.` };
  }
  return { aberta: true, motivo: "" };
}