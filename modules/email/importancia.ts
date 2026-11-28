// RN248: só os avisos importantes vão por e-mail. Esta lista decide pelo texto da notificação
// e devolve a categoria (mostrada no assunto do e-mail, nunca o texto, que tem nomes e motivos).
// Aviso que não casa com nenhuma regra fica só dentro do sistema. Para incluir um aviso novo,
// acrescente uma regra aqui (ou passe { email: true } em notificar).

const REGRAS: { categoria: string; padrao: RegExp }[] = [
  { categoria: "Inscrições", padrao: /tentou se inscrever/i },
  { categoria: "Ficha de autorização", padrao: /\bficha\b/i },
  { categoria: "Pesagem", padrao: /pesagem|\bpeso\b|categoria de peso|subiu de categoria/i },
  { categoria: "Dados bancários", padrao: /dados banc[aá]rios/i },
  { categoria: "Recurso de jogo", padrao: /\brecurso\b.*\b(jogo|partida|combate|prova|deferido|indeferido)\b|\bsobre\b.*\brecurso\b|novo recurso|seu recurso/i },
  {
    categoria: "Conferência de inscrições",
    padrao: /impugna|bloquead|indeferid|deferid|regulariz|conferência|recurso enviado para/i,
  },
  { categoria: "Inscrições", padrao: /prazo|abaixo do mínimo|mínimo de equipes|inscrições (abertas|encerr)|limite de (modalidades|provas)|acima d[aeo] (idade|limite)|retirad[oa]|idade limite/i },
  { categoria: "Boletim", padrao: /boletim/i },
  { categoria: "Evento", padrao: /exclus[aã]o do evento|coordena[cç][aã]o|removid[oa] d[ao] evento/i },
];

export function categoriaDoAviso(mensagem: string): string | null {
  for (const r of REGRAS) if (r.padrao.test(mensagem)) return r.categoria;
  return null;
}
