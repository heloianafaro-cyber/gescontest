"use client";

import { Button } from "@/components/ui/button";

export function BotaoConfirmar({
  mensagem,
  children,
}: {
  mensagem: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      variant="outline"
      onClick={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}