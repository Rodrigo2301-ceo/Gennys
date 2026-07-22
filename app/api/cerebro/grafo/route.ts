import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";
import {
  CLASSES_GRAFO,
  classeDeEntry,
  type ClasseGrafo,
} from "@/lib/cerebro/classes";

const LIMITE = 200;

const DIAS_PERIODO: Record<string, number | null> = {
  semana: 7,
  mes: 30,
  trimestre: 90,
  tudo: null,
};

interface NoGrafo {
  id: string;
  classe: ClasseGrafo;
  cor: string;
  label: string;
  origem: "entry" | "memory" | "marcacao";
  data: string;
  detalhe: Record<string, unknown>;
}

function corta(s: string, n = 26): string {
  const limpo = s.replace(/\s+/g, " ").trim();
  return limpo.length > n ? `${limpo.slice(0, n - 1)}…` : limpo;
}

function tituloDeEntry(
  dados: Record<string, unknown>,
  categoria: string | null,
): string {
  return (
    (typeof dados.nome === "string" && dados.nome) ||
    (typeof dados.titulo === "string" && dados.titulo) ||
    (typeof dados.estabelecimento === "string" && dados.estabelecimento) ||
    categoria ||
    "Registro"
  );
}

export async function GET(req: Request) {
  return secureRoute("brain:graph", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.dataRead);
    const userId = current.id;

    const { searchParams } = new URL(req.url);
    if (
      searchParams.getAll("periodo").length > 1 ||
      Array.from(searchParams.keys()).some((key) => key !== "periodo")
    ) {
      throw new ApiError(400, "INVALID_QUERY", "Parâmetros inválidos.");
    }
    const periodo = searchParams.get("periodo") ?? "mes";
    if (!(periodo in DIAS_PERIODO)) {
      throw new ApiError(400, "INVALID_PERIOD", "Período inválido.");
    }
    const dias = DIAS_PERIODO[periodo];
  const cutoff =
    dias === null ? undefined : new Date(Date.now() - dias * 86400_000);
  const filtroData = cutoff ? { createdAt: { gte: cutoff } } : {};

  const [entries, memories, marcacoes, cEntry, cMem, cMarca] =
    await Promise.all([
      prisma.entry.findMany({
        where: { userId, ...filtroData },
        orderBy: { createdAt: "desc" },
        take: LIMITE,
        select: {
          id: true,
          tipo: true,
          dados: true,
          valor: true,
          categoria: true,
          createdAt: true,
        },
      }),
      prisma.memory.findMany({
        where: { userId, ...filtroData },
        orderBy: { createdAt: "desc" },
        take: LIMITE,
        select: { id: true, fato: true, categoria: true, createdAt: true },
      }),
      prisma.verseMark.findMany({
        where: { userId, ...filtroData },
        orderBy: { createdAt: "desc" },
        take: LIMITE,
        select: {
          id: true,
          bookName: true,
          chapter: true,
          verse: true,
          texto: true,
          observacao: true,
          createdAt: true,
        },
      }),
      prisma.entry.count({ where: { userId, ...filtroData } }),
      prisma.memory.count({ where: { userId, ...filtroData } }),
      prisma.verseMark.count({ where: { userId, ...filtroData } }),
    ]);

  const nos: NoGrafo[] = [];

  for (const e of entries) {
    const classe = classeDeEntry(e.tipo);
    const dados = (e.dados ?? {}) as Record<string, unknown>;
    const valor = e.valor === null ? null : Number(e.valor);
    const titulo = tituloDeEntry(dados, e.categoria);
    const label =
      e.tipo === "financa" && valor !== null
        ? corta(
            `${titulo} · ${valor.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}`,
          )
        : corta(titulo);
    nos.push({
      id: `e_${e.id}`,
      classe,
      cor: CLASSES_GRAFO[classe].cor,
      label,
      origem: "entry",
      data: e.createdAt.toISOString(),
      detalhe: {
        tipo: e.tipo,
        titulo,
        valor,
        categoria: e.categoria,
      },
    });
  }

  for (const m of memories) {
    nos.push({
      id: `m_${m.id}`,
      classe: "memorias",
      cor: CLASSES_GRAFO.memorias.cor,
      label: corta(m.fato),
      origem: "memory",
      data: m.createdAt.toISOString(),
      detalhe: { fato: m.fato, categoria: m.categoria },
    });
  }

  for (const v of marcacoes) {
    nos.push({
      id: `v_${v.id}`,
      classe: "biblia",
      cor: CLASSES_GRAFO.biblia.cor,
      label: `${v.bookName} ${v.chapter}:${v.verse}`,
      origem: "marcacao",
      data: v.createdAt.toISOString(),
      detalhe: {
        ref: `${v.bookName} ${v.chapter}:${v.verse}`,
        texto: v.texto,
        observacao: v.observacao,
      },
    });
  }

  // Mantém os 200 mais recentes no geral.
  nos.sort((a, b) => (a.data < b.data ? 1 : -1));
  const visiveis = nos.slice(0, LIMITE);

  // Links em estrela por cluster: cada nó liga ao primeiro nó da sua classe.
  const primeiroDaClasse = new Map<ClasseGrafo, string>();
  const links: { source: string; target: string }[] = [];
  for (const no of visiveis) {
    const primeiro = primeiroDaClasse.get(no.classe);
    if (primeiro === undefined) {
      primeiroDaClasse.set(no.classe, no.id);
    } else {
      links.push({ source: no.id, target: primeiro });
    }
  }

  const total = cEntry + cMem + cMarca;

    return okJson({
      nodes: visiveis,
      links,
      total,
      mostrando: visiveis.length,
      limite: LIMITE,
    });
  });
}
