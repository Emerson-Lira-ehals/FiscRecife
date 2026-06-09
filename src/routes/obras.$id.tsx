import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  MapPin,
  Megaphone,
  MessageSquare,
  Send,
  Wallet,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchObra,
  fetchFotos,
  fetchComunicados,
  fetchComentarios,
  fetchProfilesByIds,
  logAuditoria,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import {
  resolveFoto,
  formatCurrency,
  formatDate,
  formatDateTime,
  daysBetween,
  ROLE_LABELS,
} from "@/lib/obra-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/obras/$id")({
  component: ObraDetail,
  errorComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
      Não foi possível carregar esta obra.
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
      Obra não encontrada.
    </div>
  ),
});

function SectionTitle({ icon: Icon, children }: { icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
      <Icon className="h-5 w-5 text-primary" /> {children}
    </h2>
  );
}

function ObraDetail() {
  const { id } = useParams({ from: "/obras/$id" });
  const qc = useQueryClient();
  const { isAuthenticated, role, user, profile } = useAuth();

  const obraQ = useQuery({ queryKey: ["obra", id], queryFn: () => fetchObra(id) });
  const fotosQ = useQuery({ queryKey: ["fotos", id], queryFn: () => fetchFotos(id) });
  const comunicadosQ = useQuery({ queryKey: ["comunicados", id], queryFn: () => fetchComunicados(id) });
  const comentariosQ = useQuery({ queryKey: ["comentarios", id], queryFn: () => fetchComentarios(id) });

  const authorIds = [
    ...(comunicadosQ.data ?? []).map((c) => c.usuario_id),
    ...(comentariosQ.data ?? []).map((c) => c.usuario_id),
  ];
  const profilesQ = useQuery({
    queryKey: ["profiles", authorIds.sort().join(",")],
    queryFn: () => fetchProfilesByIds(Array.from(new Set(authorIds))),
    enabled: authorIds.length > 0,
  });

  const [comentario, setComentario] = useState("");
  const [comunicado, setComunicado] = useState("");
  const [activeFoto, setActiveFoto] = useState(0);

  const obra = obraQ.data;
  const fotos = fotosQ.data ?? [];
  const profiles = profilesQ.data ?? {};

  const canComunicado = role === "gestor" || role === "agente";

  const addComentario = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("comentarios").insert({
        obra_id: id,
        usuario_id: user!.id,
        comentario: comentario.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setComentario("");
      qc.invalidateQueries({ queryKey: ["comentarios", id] });
      toast.success("Comentário publicado.");
    },
    onError: () => toast.error("Não foi possível publicar o comentário."),
  });

  const addComunicado = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("comunicados").insert({
        obra_id: id,
        usuario_id: user!.id,
        mensagem: comunicado.trim(),
      });
      if (error) throw new Error(error.message);
      await logAuditoria(id, "Publicou comunicado", "comunicados", user!.id, profile?.nome || "Usuário");
    },
    onSuccess: () => {
      setComunicado("");
      qc.invalidateQueries({ queryKey: ["comunicados", id] });
      toast.success("Comunicado publicado.");
    },
    onError: () => toast.error("Não foi possível publicar o comunicado."),
  });

  if (obraQ.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 aspect-[16/9] w-full rounded-xl" />
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        Obra não encontrada.
      </div>
    );
  }

  const saldo = obra.valor_previsto - obra.valor_executado;
  const consumo = obra.valor_previsto > 0 ? Math.round((obra.valor_executado / obra.valor_previsto) * 100) : 0;
  const atraso = daysBetween(obra.data_prevista, obra.data_atualizada);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
      </Button>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{obra.nome}</h1>
        <StatusBadge status={obra.status} />
      </div>
      <p className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" /> {obra.endereco}, {obra.bairro}
      </p>

      {/* Galeria */}
      <section className="mb-8">
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={resolveFoto(fotos[activeFoto]?.url ?? obra.foto_principal)}
            alt={fotos[activeFoto]?.legenda ?? obra.nome}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
        {fotos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {fotos.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveFoto(i)}
                className={`relative shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === activeFoto ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={resolveFoto(f.url)} alt={f.legenda} className="h-16 w-24 object-cover" />
                {f.tipo === "ilustrativa" && (
                  <span className="absolute bottom-0 left-0 right-0 bg-navy/80 px-1 py-0.5 text-[9px] text-navy-foreground">
                    Previsão final
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Informações gerais */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionTitle icon={Building2}>Informações gerais</SectionTitle>
            <p className="mb-4 text-sm text-muted-foreground">{obra.descricao}</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Empreiteira" value={obra.empreiteira} />
              <Info label="Órgão responsável" value={obra.orgao_responsavel} />
              <Info label="Início" value={formatDate(obra.data_inicio)} />
              <Info label="Previsão de entrega" value={formatDate(obra.data_prevista)} />
            </dl>
          </section>

          {/* Andamento */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionTitle icon={Calendar}>Andamento</SectionTitle>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Execução física</span>
              <span className="font-semibold text-foreground">{obra.percentual_concluido}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="animate-grow-bar h-full rounded-full bg-primary"
                style={{ width: `${obra.percentual_concluido}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Planejado para o período: {obra.percentual_planejado}%
            </p>
          </section>

          {/* Financeiro */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionTitle icon={Wallet}>Financeiro</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Metric label="Previsto" value={formatCurrency(obra.valor_previsto)} />
              <Metric label="Executado" value={formatCurrency(obra.valor_executado)} tone="primary" />
              <Metric
                label="Saldo"
                value={formatCurrency(saldo)}
                tone={saldo < 0 ? "danger" : "success"}
              />
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Orçamento consumido</span>
                <span className="font-semibold text-foreground">{consumo}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${consumo > 100 ? "bg-danger" : "bg-success"}`}
                  style={{ width: `${Math.min(consumo, 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* Cronograma */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionTitle icon={CalendarClock}>Cronograma</SectionTitle>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Data planejada" value={formatDate(obra.data_prevista)} />
              <Info label="Data atualizada" value={formatDate(obra.data_atualizada)} />
            </dl>
            {atraso !== 0 && (
              <p
                className={`mt-3 inline-flex rounded-md px-3 py-1.5 text-xs font-medium ${
                  atraso > 0 ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                }`}
              >
                {atraso > 0
                  ? `${atraso} dia(s) de atraso em relação ao previsto`
                  : `${Math.abs(atraso)} dia(s) adiantado em relação ao previsto`}
              </p>
            )}
          </section>

          {/* Comunicados */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionTitle icon={Megaphone}>Comunicados oficiais</SectionTitle>
            {canComunicado && (
              <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3">
                <Textarea
                  value={comunicado}
                  onChange={(e) => setComunicado(e.target.value)}
                  placeholder="Publicar um comunicado oficial sobre a obra..."
                  rows={2}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!comunicado.trim() || addComunicado.isPending}
                    onClick={() => addComunicado.mutate()}
                  >
                    {addComunicado.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Publicar
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {(comunicadosQ.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum comunicado publicado.</p>
              )}
              {(comunicadosQ.data ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm text-foreground">{c.mensagem}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {profiles[c.usuario_id]?.nome ?? "Equipe"} · {formatDateTime(c.data_publicacao)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Comentários da comunidade */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionTitle icon={MessageSquare}>Comunidade</SectionTitle>
            {isAuthenticated ? (
              <div className="mb-4">
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Deixe um comentário..."
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!comentario.trim() || addComentario.isPending}
                    onClick={() => addComentario.mutate()}
                  >
                    {addComentario.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Enviar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mb-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <Link to="/auth" className="font-medium text-primary hover:underline">
                  Entre
                </Link>{" "}
                para deixar um comentário.
              </p>
            )}
            <div className="space-y-3">
              {(comentariosQ.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Seja o primeiro a comentar.</p>
              )}
              {(comentariosQ.data ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm text-foreground">{c.comentario}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {profiles[c.usuario_id]?.nome ?? "Cidadão"} · {formatDateTime(c.data_comentario)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
