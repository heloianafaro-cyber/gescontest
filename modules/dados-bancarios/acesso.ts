// RN228: quem pode ver os dados bancários completos de um atleta. Lógica pura (sem banco).
// Staff, Administrador e o próprio sistema público nunca entram aqui.

export function podeVerDados(p: {
  perfil: string; // perfil de quem quer ver
  delegacaoDoVisor: number | null; // delegação do chefe (só usada para TECNICO)
  delegacaoDoAtleta: number | null;
  coordenaOEvento: boolean; // o visor é coordenador do evento (só usada para PROF)
  eventoPede: boolean; // o evento pede dados bancários
  atletaInscrito: boolean; // o atleta está inscrito em alguma equipe do evento
}): boolean {
  if (!p.eventoPede || !p.atletaInscrito) return false;
  if (p.perfil === "PROF") return p.coordenaOEvento;
  if (p.perfil === "TECNICO") {
    return p.delegacaoDoVisor !== null && p.delegacaoDoVisor === p.delegacaoDoAtleta;
  }
  return false;
}
