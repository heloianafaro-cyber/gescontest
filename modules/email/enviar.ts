// RN247-RN252: envio de e-mail pelo Resend (API HTTP, sem pacote extra).
// Variáveis: RESEND_API_KEY (chave), EMAIL_REMETENTE (ex.: "GesContest <avisos@seudominio.com.br>"),
// EMAIL_MODO_TESTE (e-mail da conta do Resend: com ela preenchida, TODO envio vai só para esse endereço).

export type Envio = { para: string; assunto: string; texto: string };
export type ResultadoEnvio = { ok: boolean; erro?: string };

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function enviarEmail(envio: Envio): Promise<ResultadoEnvio> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return { ok: false, erro: "RESEND_API_KEY não configurada." };

  const remetente = process.env.EMAIL_REMETENTE?.trim() || "GesContest <onboarding@resend.dev>";
  const teste = process.env.EMAIL_MODO_TESTE?.trim();

  // Modo de teste (sem domínio próprio): o Resend só entrega para o e-mail da própria conta.
  const para = teste || envio.para;
  const assunto = teste ? `[TESTE para ${envio.para}] ${envio.assunto}` : envio.assunto;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente, to: [para], subject: assunto, text: envio.texto }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resposta.ok) {
      const corpo = await resposta.text();
      return { ok: false, erro: `Resend respondeu ${resposta.status}: ${corpo.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao falar com o Resend." };
  }
}
