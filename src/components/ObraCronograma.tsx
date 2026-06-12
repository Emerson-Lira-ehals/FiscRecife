import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ListChecks,
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
  Paperclip,
  MapPin,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  fetchAtividades,
  enviarAtividadeParaValidacao,
  validarAtividade,
  uploadEvidencia,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted text-muted-foreground",
};

export function ObraCronograma({ obraId }: { obraId: string }) {
  const qc = useQueryClient();
  const { role, user, profile } = useAuth();
  const atividadesQ = useQuery({
    queryKey: ["atividades", obraId],
    queryFn: () => fetchAtividades(obraId),
  });

  const canGestor = role === "gestor" || role === "admin" || role === "prefeitura";
  const canFiscal = role === "fiscal" || role === "admin" || role === "prefeitura";

  const [enviar, setEnviar] = useState<ObraAtividade | null>(null);
  const [reprovar, setReprovar] = useState<ObraAtividade | null>(null);

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

  const aprovarMut = useMutation({
    mutationFn: (a: ObraAtividade) =>
      validarAtividade({
        atividadeId: a.id,
        obraId,
        aprovar: true,
        usuarioId: user!.id,
        usuarioNome: profile?.nome || "Fiscal",
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Atividade aprovada. Avanço físico atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

                        {/* Ações */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {canGestor &&
                            (a.status === "nao_iniciada" ||
                              a.status === "em_execucao" ||
                              a.status === "rejeitada") && (
                              <Button size="sm" variant="outline" onClick={() => setEnviar(a)}>
                                <Upload className="mr-1 h-3.5 w-3.5" /> Enviar para validação
                              </Button>
                            )}
                          {canFiscal && a.status === "aguardando_validacao" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => aprovarMut.mutate(a)}
                                disabled={aprovarMut.isPending}
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReprovar(a)}
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" /> Reprovar
                              </Button>
                            </>
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

      <EnviarDialog
        atividade={enviar}
        obraId={obraId}
        onClose={() => setEnviar(null)}
        onDone={invalidate}
      />
      <ReprovarDialog
        atividade={reprovar}
        obraId={obraId}
        onClose={() => setReprovar(null)}
        onDone={invalidate}
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

function EnviarDialog({
  atividade,
  obraId,
  onClose,
  onDone,
}: {
  atividade: ObraAtividade | null;
  obraId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user, profile } = useAuth();
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [gps, setGps] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const fotoPath = await uploadEvidencia(obraId, foto!);
      let docPath: string | null = null;
      if (doc) docPath = await uploadEvidencia(obraId, doc);
      await enviarAtividadeParaValidacao({
        atividadeId: atividade!.id,
        obraId,
        comentario,
        fotoPath,
        docPath,
        gps: gps.trim() || null,
        usuarioId: user!.id,
        usuarioNome: profile?.nome || "Gestor",
      });
    },
    onSuccess: () => {
      toast.success("Atividade enviada para validação do fiscal.");
      reset();
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao enviar."),
  });

  const reset = () => {
    setComentario("");
    setFoto(null);
    setDoc(null);
    setGps("");
  };

  const captureGps = () => {
    if (!navigator.geolocation) return toast.error("GPS indisponível.");
    navigator.geolocation.getCurrentPosition(
      (p) => setGps(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`),
      () => toast.error("Não foi possível obter a localização."),
    );
  };

  return (
    <Dialog open={!!atividade} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar evidência · {atividade?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Foto e comentário são obrigatórios. A atividade ficará aguardando aprovação do fiscal.
          </p>
          <div>
            <Label className="mb-1.5 block text-xs">Foto da execução *</Label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Comentário *</Label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Descreva o que foi executado..."
              rows={3}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Documento (opcional)</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.xls"
              onChange={(e) => setDoc(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Localização GPS (opcional)</Label>
            <div className="flex gap-2">
              <Input value={gps} onChange={(e) => setGps(e.target.value)} placeholder="lat, long" />
              <Button type="button" variant="outline" size="icon" onClick={captureGps}>
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={mut.isPending || !foto || comentario.trim().length < 3}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="mr-1 h-4 w-4" />
            )}
            Enviar para validação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReprovarDialog({
  atividade,
  obraId,
  onClose,
  onDone,
}: {
  atividade: ObraAtividade | null;
  obraId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user, profile } = useAuth();
  const [justificativa, setJustificativa] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      validarAtividade({
        atividadeId: atividade!.id,
        obraId,
        aprovar: false,
        justificativa,
        usuarioId: user!.id,
        usuarioNome: profile?.nome || "Fiscal",
      }),
    onSuccess: () => {
      toast.success("Atividade reprovada.");
      setJustificativa("");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!atividade} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprovar · {atividade?.nome}</DialogTitle>
        </DialogHeader>
        <div>
          <Label className="mb-1.5 block text-xs">Justificativa *</Label>
          <Textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Explique o motivo da reprovação..."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={mut.isPending || justificativa.trim().length < 3}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirmar reprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
