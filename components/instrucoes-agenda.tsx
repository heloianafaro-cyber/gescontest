export function InstrucoesAgenda() {
  return (
    <section className="max-w-3xl space-y-2 rounded-lg border p-4 text-sm">
      <h2 className="font-medium">Como colocar na sua agenda</h2>
      <p>
        <strong>Assinar (recomendado):</strong> copie o link e adicione como agenda por endereço. Quando os horários
        mudarem, a sua agenda se atualiza sozinha (o Google Agenda pode demorar horas para atualizar).
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Google Agenda (computador):</strong> Outras agendas → <em>+</em> → <em>Por URL</em> → cole o link.
        </li>
        <li>
          <strong>Outlook:</strong> Adicionar agenda → <em>Assinar na Web</em> → cole o link.
        </li>
        <li>
          <strong>iPhone / Mac:</strong> toque em <em>Abrir na agenda</em>.
        </li>
      </ul>
      <p>
        <strong>Baixar .ics:</strong> importa os jogos uma vez, sem atualização automática.
      </p>
    </section>
  );
}
