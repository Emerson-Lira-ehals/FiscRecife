import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ListChecks,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchAtividades,
  signedEvidenciaUrl,
  type ObraAtividade,
} from "@/lib/queries";
import {
  ATIVIDADE_STATUS_LABELS,
  ATIVIDADE_STATUS_CLASSES,
  ATIVIDADE_STATUS_DOT,
  atividadeSla,
  formatDate,
} from "@/lib/obra-utils";
import { Button } from "@/components/ui/button";
import { EvidenciaDialog } from "@/components/EvidenciaDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted text-muted-foreground",
};

export function ObraCronograma({ obraId }: { obraId: string }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const atividadesQ = useQuery({
    queryKey: ["atividades", obraId],
    queryFn: () => fetchAtividades(obraId),
  });

  const canGestor = role === "gestor" || role === "admin" || role === "prefeitura";
  const canFiscal = role === "fiscal" || role === "admin" || role === "prefeitura";

  const [evid, setEvid] = useState<ObraAtividade | null>(null);

  const atividades = atividadesQ.data ?? [];
  const grupos = useMemo(() => {
    const map = new Map<string, ObraAtividade[]>();
    atividades.forEach((a) => {
      const arr = map.get(a.macroetapa) ?? [];
      arr.push(a);
      map.set(a.macroetapa, arr);
    });
    return Array.from(map.entries());
  }, [atividades]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["atividades", obraId] });
    qc.invalidateQueries({ queryKey: ["obra", obraId] });
    qc.invalidateQueries({ queryKey: ["obras"] });
    qc.invalidateQueries({ queryKey: ["auditoria", obraId] });
  };

  const totalPeso = atividades.reduce((s, a) => s + Number(a.peso), 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
        <ListChecks className="h-5 w-5 text-primary" /> Cronograma & avanço físico
      </h2>
      <p className="mb-4 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        O percentual da obra é calculado automaticamente pela soma dos pesos das atividades aprovadas
        pelo fiscal. Ninguém edita o avanço manualmente.
      </p>

      {atividadesQ.isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando atividades...</p>
      ) : atividades.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma atividade cadastrada no cronograma desta obra.
        </p>
      ) : (
        <div className="space-y-5">
          {grupos.map(([macro, items]) => {
            const pesoGrupo = items.reduce((s, a) => s + Number(a.peso), 0);
            return (
              <div key={macro}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{macro}</h3>
                  <span className="text-xs text-muted-foreground">Peso {pesoGrupo.toFixed(0)}%</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => {
                    const sla = atividadeSla(a);
                    return (
                      <div
                        key={a.id}
                        className="rounded-lg border border-border bg-background p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                ATIVIDADE_STATUS_DOT[a.status],
                              )}
                            />
                            <span className="text-sm font-medium text-foreground">{a.nome}</span>
                            <span className="text-xs text-muted-foreground">
                              · peso {Number(a.peso).toFixed(0)}%
                            </span>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              ATIVIDADE_STATUS_CLASSES[a.status],
                            )}
                          >
                            {ATIVIDADE_STATUS_LABELS[a.status]}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Prazo: {formatDate(a.data_planejada_fim)}</span>
                          {a.data_real_fim && <span>Concluída: {formatDate(a.data_real_fim)}</span>}
                          <span className={cn("rounded px-1.5 py-0.5 font-medium", TONE[sla.tone])}>
                            {sla.label}
                          </span>
                        </div>

                        {a.status === "rejeitada" && a.justificativa && (
                          <p className="mt-2 rounded-md bg-danger/10 px-2 py-1.5 text-xs text-danger">
                            Reprovada: {a.justificativa}
                          </p>
                        )}

                        {a.status === "aguardando_validacao" && a.evidencia_comentario && (
                          <div className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Evidência: </span>
                            {a.evidencia_comentario}
                            {a.evidencia_foto && <EvidenciaLink path={a.evidencia_foto} />}
                          </div>
                        )}

                        {/* Ações — mesmo fluxo do botão de clipe da área do Fiscal */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {canGestor &&
                            (a.status === "nao_iniciada" ||
                              a.status === "em_execucao" ||
                              a.status === "rejeitada") && (
                              <Button size="sm" variant="outline" onClick={() => setEvid(a)}>
                                <Upload className="mr-1 h-3.5 w-3.5" /> Enviar para validação
                              </Button>
                            )}
                          {canFiscal && a.status === "aguardando_validacao" && (
                            <Button size="sm" onClick={() => setEvid(a)}>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Validar evidência
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="text-right text-xs text-muted-foreground">
            Soma dos pesos: {totalPeso.toFixed(0)}%
          </p>
        </div>
      )}

      <EvidenciaDialog
        open={!!evid}
        atividade={evid}
        obraId={obraId}
        onClose={() => setEvid(null)}
        onChanged={invalidate}
      />
    </section>
  );
}

function EvidenciaLink({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className="ml-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
      onClick={async () => {
        setLoading(true);
        const url = await signedEvidenciaUrl(path);
        setLoading(false);
        if (url) window.open(url, "_blank");
        else toast.error("Não foi possível abrir a evidência.");
      }}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
      ver foto
    </button>
  );
}
