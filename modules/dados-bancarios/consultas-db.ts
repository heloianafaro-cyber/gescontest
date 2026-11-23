import { prisma } from "@/lib/prisma";
import { decifrar, mascarar } from "@/modules/seguranca/cifra";
import { podeVerDados } from "./acesso";

export type LinhaAtleta = {
  id: number;
  nome: string;
  matricula: string | null;
  delegacao: string | null;
  preenchido: boolean;
};

export type EventoComAtletas = { id: number; nome: string; atletas: LinhaAtleta[] };

// Atletas inscritos em eventos que pedem dados bancários (RN225), com o estado (preenchido ou pendente).
// Nunca devolve os dados em si. Com delegacaoId, só os atletas daquela delegação (tela do chefe);
// com eventoId, só aquele evento (tela do coordenador).
export async function atletasPorEvento(filtro: { delegacaoId?: number; eventoId?: number }): Promise<EventoComAtletas[]> {
  const vinculos = await prisma.equipeAtleta.findMany({
    where: {
      atleta: filtro.delegacaoId !== undefined ? { delegacaoId: filtro.delegacaoId } : undefined,
      equipe: {
        modalidade: {
          eventoId: filtro.eventoId,
          evento: { pedeDadosBancarios: true },
        },
      },
    },
    select: {
      atleta: {
        select: {
          id: true,
          nome: true,
          matricula: true,
          delegacao: { select: { nome: true } },
          dadoBancario: { select: { usuarioId: true } },
        },
      },
      equipe: { select: { modalidade: { select: { evento: { select: { id: true, nome: true } } } } } },
    },
  });

  const porEvento = new Map<number, { nome: string; atletas: Map<number, LinhaAtleta> }>();
  for (const v of vinculos) {
    const ev = v.equipe.modalidade.evento;
    const grupo = porEvento.get(ev.id) ?? { nome: ev.nome, atletas: new Map() };
    grupo.atletas.set(v.atleta.id, {
      id: v.atleta.id,
      nome: v.atleta.nome,
      matricula: v.atleta.matricula,
      delegacao: v.atleta.delegacao?.nome ?? null,
      preenchido: v.atleta.dadoBancario !== null,
    });
    porEvento.set(ev.id, grupo);
  }

  return [...porEvento.entries()]
    .map(([id, g]) => ({
      id,
      nome: g.nome,
      // pendentes primeiro, depois por nome
      atletas: [...g.atletas.values()].sort((a, b) => Number(a.preenchido) - Number(b.preenchido) || a.nome.localeCompare(b.nome, "pt-BR")),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export type DadosAbertos = {
  atleta: { id: number; nome: string; matricula: string | null };
  preenchido: boolean;
  banco?: string;
  tipoConta?: "CORRENTE" | "POUPANCA";
  agencia?: string;
  conta?: string;
  titular?: string;
  completo: boolean;
  acessos: { em: Date; quem: string }[];
};

// RN228, RN229, RN231: confere se a pessoa pode ver, mostra mascarado e, só com completo = true,
// decifra e grava o acesso (quem, de qual atleta, quando). Devolve null quando não pode ver.
export async function abrirDados(p: {
  visorId: number;
  perfil: "PROF" | "TECNICO";
  atletaId: number;
  eventoId: number;
  completo: boolean;
}): Promise<DadosAbertos | null> {
  const [visor, atleta, evento, inscrito, coordena] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: p.visorId }, select: { delegacaoId: true } }),
    prisma.usuario.findUnique({
      where: { id: p.atletaId },
      select: { id: true, nome: true, matricula: true, tipo: true, delegacaoId: true, dadoBancario: true },
    }),
    prisma.evento.findUnique({ where: { id: p.eventoId }, select: { pedeDadosBancarios: true } }),
    prisma.equipeAtleta.count({ where: { atletaId: p.atletaId, equipe: { modalidade: { eventoId: p.eventoId } } } }),
    prisma.eventoCoordenador.count({ where: { eventoId: p.eventoId, usuarioId: p.visorId } }),
  ]);
  if (!visor || !atleta || atleta.tipo !== "ATLETA" || !evento) return null;

  const pode = podeVerDados({
    perfil: p.perfil,
    delegacaoDoVisor: visor.delegacaoId,
    delegacaoDoAtleta: atleta.delegacaoId,
    coordenaOEvento: coordena > 0,
    eventoPede: evento.pedeDadosBancarios,
    atletaInscrito: inscrito > 0,
  });
  if (!pode) return null;

  const acessos = await prisma.acessoDadoBancario.findMany({
    where: { atletaId: p.atletaId },
    orderBy: { em: "desc" },
    take: 10,
    select: { em: true, acessadoPor: { select: { nome: true } } },
  });
  const base = {
    atleta: { id: atleta.id, nome: atleta.nome, matricula: atleta.matricula },
    acessos: acessos.map((a) => ({ em: a.em, quem: a.acessadoPor.nome })),
  };

  const d = atleta.dadoBancario;
  if (!d) return { ...base, preenchido: false, completo: false };

  const agencia = decifrar(d.agenciaCifrada);
  const conta = decifrar(d.contaCifrada);
  const titular = p.completo ? decifrar(d.titularCifrado) : "";

  if (!p.completo) {
    return {
      ...base,
      preenchido: true,
      completo: false,
      banco: d.banco,
      tipoConta: d.tipoConta,
      agencia: mascarar(agencia, 1),
      conta: mascarar(conta, 2),
      titular: "••••••••",
    };
  }

  await prisma.acessoDadoBancario.create({
    data: { atletaId: atleta.id, acessadoPorId: p.visorId, eventoId: p.eventoId },
  });
  return { ...base, preenchido: true, completo: true, banco: d.banco, tipoConta: d.tipoConta, agencia, conta, titular };
}
