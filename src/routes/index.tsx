import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { fetchObras } from "@/lib/queries";
import { useUI } from "@/lib/ui-context";
import { StatusBadge } from "@/components/StatusBadge";
import { resolveFoto, formatCurrency } from "@/lib/obra-utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FiscRecife — Transparência das Obras Públicas" },
      {
        name: "description",
        content:
          "Acompanhe, monitore e fiscalize as obras públicas da cidade do Recife com transparência total: andamento, finanças e cronograma em tempo real.",
      },
      { property: "og:title", content: "FiscRecife — Transparência das Obras Públicas" },
      {
        property: "og:description",
        content: "Monitoramento e transparência das obras públicas da cidade do Recife.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { search } = useUI();
  const { data: obras, isLoading, error } = useQuery({ queryKey: ["obras"], queryFn: fetchObras });

  const filtered = (obras ?? []).filter((o) =>
    o.nome.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div>
      <section
        className="border-b border-border px-4 py-12 text-navy-foreground sm:py-16"
        style={{ background: "var(--gradient-navy)" }}
      >
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary-foreground">
            <Building2 className="h-3.5 w-3.5" /> Portal de Transparência
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Obras públicas do Recife, acompanhadas em tempo real
          </h1>
          <p className="mt-3 max-w-xl text-sm text-navy-foreground/70 sm:text-base">
            Transparência, eficiência e confiabilidade no monitoramento de cada obra da cidade.
            Consulte andamento físico, execução financeira e cronograma.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Catálogo de obras
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Carregando..." : `${filtered.length} obra(s) encontrada(s)`}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            Não foi possível carregar as obras. Tente novamente.
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhuma obra corresponde à pesquisa.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((obra) => (
              <article
                key={obra.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={resolveFoto(obra.foto_principal)}
                    alt={obra.nome}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3">
                    <StatusBadge status={obra.status} className="shadow" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 font-semibold text-foreground">{obra.nome}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {obra.bairro}
                  </p>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Concluído</span>
                      <span className="font-semibold text-foreground">
                        {obra.percentual_concluido}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${obra.percentual_concluido}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Investimento previsto:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(obra.valor_previsto)}
                    </span>
                  </p>

                  <Button asChild className="mt-4 w-full">
                    <Link to="/obras/$id" params={{ id: obra.id }}>
                      Visualizar Obra <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
