   import { NextResponse } from "next/server";
   import { randomUUID } from "node:crypto";
   import { FichaStatus } from "@prisma/client";
   import { auth } from "@/lib/auth";
   import { prisma } from "@/lib/prisma";
   import { apagarArquivo, salvarArquivo } from "@/lib/storage";
   import { calcularIdade } from "@/modules/usuarios/idade";
   import { detectarTipo, LIMITE_FICHA } from "@/modules/usuarios/ficha";

   const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: mensagem }, { status });

   export async function POST(req: Request) {
     const sessao = await auth.api.getSession({ headers: req.headers });
     if (!sessao || sessao.user.tipo !== "ATLETA") return erro("Não autorizado.", 401);

     const id = Number(sessao.user.id);
     const atleta = await prisma.usuario.findUnique({ where: { id } });
     if (!atleta) return erro("Não autorizado.", 401);

     if (!atleta.dataNascimento || calcularIdade(atleta.dataNascimento) >= 18) {
       return erro("A ficha é exigida apenas de menores de 18 anos.");
     }
     if (atleta.fichaStatus === FichaStatus.APROVADA) return erro("Sua ficha já foi aprovada.");

     const form = await req.formData();
     const arquivo = form.get("ficha");
     if (!(arquivo instanceof File)) return erro("Selecione um arquivo.");
     if (arquivo.size > LIMITE_FICHA) return erro("O arquivo deve ter no máximo 4 MB.");

     const corpo = Buffer.from(await arquivo.arrayBuffer());
     const tipo = detectarTipo(corpo);
     if (!tipo) return erro("Envie um arquivo PDF, JPG ou PNG.");

     const chave = `fichas/${id}/${randomUUID()}.${tipo.ext}`;
     await salvarArquivo(chave, corpo, tipo.tipo);

     await prisma.usuario.update({
       where: { id },
       data: { fichaArquivo: chave, fichaStatus: FichaStatus.PENDENTE, fichaMotivoRecusa: null },
     });

     // Só a ficha mais recente é mantida (RN101): apaga a anterior.
     if (atleta.fichaArquivo) await apagarArquivo(atleta.fichaArquivo).catch(() => {});

     return NextResponse.json({ ok: true });
   }