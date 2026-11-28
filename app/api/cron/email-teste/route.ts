import { enviarEmail, emailConfigurado } from "@/modules/email/enviar";
import { montarEmail } from "@/modules/email/avisos";

// Teste do envio de e-mail. Protegido pelo mesmo segredo da rotina diária.
// Uso: curl -H "Authorization: Bearer SEU_CRON_SECRET" "https://.../api/cron/email-teste?para=voce@exemplo.com"
// Com EMAIL_MODO_TESTE preenchida, o e-mail vai para esse endereço, qualquer que seja o "para".
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  if (!emailConfigurado()) {
    return Response.json({ ok: false, erro: "RESEND_API_KEY não está configurada." }, { status: 500 });
  }
  const para = new URL(request.url).searchParams.get("para")?.trim() || process.env.EMAIL_MODO_TESTE?.trim();
  if (!para) {
    return Response.json({ ok: false, erro: "Informe ?para=email ou configure EMAIL_MODO_TESTE." }, { status: 400 });
  }
  const { assunto, texto } = montarEmail("Teste de envio");
  const resultado = await enviarEmail({ para, assunto, texto });
  return Response.json(
    { ...resultado, modoTeste: Boolean(process.env.EMAIL_MODO_TESTE?.trim()) },
    { status: resultado.ok ? 200 : 502 }
  );
}
