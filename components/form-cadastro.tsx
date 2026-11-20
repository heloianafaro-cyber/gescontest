"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { cadastroSchema } from "@/modules/usuarios/schemas";
import { escolherDelegacao } from "@/modules/usuarios/delegacao-atleta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { delegacoes: { id: number; nome: string }[] };

const campos = [
  ["nome", "Nome completo", "text"],
  ["email", "E-mail", "email"],
  ["senha", "Senha", "password"],
  ["celular", "Celular (com DDD)", "tel"],
  ["cpf", "CPF", "text"],
  ["matricula", "Matrícula", "text"],
  ["dataNascimento", "Data de nascimento", "date"],
] as const;

export function FormCadastro({ delegacoes }: Props) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const dados = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;

    const resultado = cadastroSchema.safeParse(dados);
    if (!resultado.success) {
      setErro(resultado.error.issues[0].message);
      return;
    }
    if (delegacoes.length > 0 && !resultado.data.delegacaoId) {
      setErro("Escolha a sua delegação.");
      return;
    }

    setCarregando(true);
    const { nome, email, senha, celular, cpf, matricula, dataNascimento, delegacaoId } = resultado.data;
    const { error } = await authClient.signUp.email({
      name: nome,
      email,
      password: senha,
      celular,
      cpf: cpf.replace(/\D/g, ""),
      matricula,
      dataNascimento: new Date(dataNascimento),
    });

    if (error) {
      setCarregando(false);
      setErro(error.message ?? "Não foi possível concluir o cadastro.");
      return;
    }

    // Conta criada e logada: grava a delegação escolhida.
    if (delegacaoId) {
      const fd = new FormData();
      fd.set("delegacaoId", delegacaoId);
      const r = await escolherDelegacao({ erro: "" }, fd);
      if (r.erro) {
        setCarregando(false);
        router.push("/atleta/delegacao"); // tenta de novo por lá
        return;
      }
    }
    setCarregando(false);
    router.push("/painel");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cadastro de atleta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="space-y-4">
            {campos.map(([nome, rotulo, tipo]) => (
              <div key={nome} className="space-y-1">
                <Label htmlFor={nome}>{rotulo}</Label>
                <Input id={nome} name={nome} type={tipo} />
              </div>
            ))}

            <div className="space-y-1">
              <Label htmlFor="delegacaoId">Delegação</Label>
              {delegacoes.length > 0 ? (
                <select
                  id="delegacaoId"
                  name="delegacaoId"
                  defaultValue=""
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
                >
                  <option value="" disabled>Escolha...</option>
                  {delegacoes.map((d) => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ainda não há delegações cadastradas. Você poderá escolher a sua depois.
                </p>
              )}
            </div>

            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando ? "Enviando..." : "Cadastrar"}
            </Button>
            <p className="text-sm">
              Já tem conta? <Link href="/login" className="underline">Entrar</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}