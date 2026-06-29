import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Image as ImageIcon,
  Link2,
  Loader2,
  MapPin,
  Paperclip,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  criarAtividadeVinculada,
  enviarAtividadeParaValidacao,
  signedEvidenciaUrl,
  uploadEvidencia,
  validarAtividade,
  type ObraAtividade,
} from "@/lib/queries";
import {
  ATIVIDADE_STATUS_CLASSES,
  ATIVIDADE_STATUS_LABELS,
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

/**
 * Diálogo único de evidências/validação de uma atividade do cronograma
 * (tabela obra_atividades). Usado tanto na etapa inicial (ObraCronograma)
 * quanto pelo botão de clipe da área do Fiscal (checklist), garantindo que
 * ambos compartilhem exatamente a mesma lógica e a mesma base de dados.
 */
export function EvidenciaDialog({
  open,
  onClose,
  obraId,
  atividade,
  fallbackNome,
  fallbackMacroetapa,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  obraId: string;
  /** Atividade já vinculada; quando nula, oferece criar uma a partir do fallback. */
  atividade: ObraAtividade | null;
  fallbackNome?: string;
  fallbackMacroetapa?: string;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const { role, user, profile } = useAuth();

  const canGestor = role === "gestor" || role === "admin" || role === "prefeitura";
  const canFiscal = role === "fiscal" || role === "admin" || role === "prefeitura";

  const [current, setCurrent] = useState<ObraAtividade | null>(atividade);
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [gps, setGps] = useState("");
  const [reprovando, setReprovando] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  // Sincroniza o estado interno quando a atividade de entrada muda / o diálogo abre.
  useEffect(() => {
    if (open) {
      setCurrent(atividade);
      setComentario("");
      setFoto(null);
      setDoc(null);
      setGps("");
      setReprovando(false);
      setJustificativa("");
    }
  }, [open, atividade]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["atividades", obraId] });
    qc.invalidateQueries({ queryKey: ["obra", obraId] });
    qc.invalidateQueries({ queryKey: ["obras"] });
    qc.invalidateQueries({ queryKey: ["auditoria", obraId] });
    onChanged?.();
  };

  const criarMut = useMutation({
    mutationFn: () =>
      criarAtividadeVinculada({
        obraId,
        macroetapa: fallbackMacroetapa || "Checklist",
        nome: fallbackNome || "Item da checklist",
        usuarioId: user?.id ?? null,
        usuarioNome: profile?.nome || "Usuário",
      }),
    onSuccess: (nova) => {
      setCurrent(nova);
      invalidate();
      toast.success("Atividade vinculada ao cronograma.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enviarMut = useMutation({
    mutationFn: async () => {
      const fotoPath = await uploadEvidencia(obraId, foto!);
      let docPath: string | null = null;
      if (doc) docPath = await uploadEvidencia(obraId, doc);
      await enviarAtividadeParaValidacao({
        atividadeId: current!.id,
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
      toast.success("Evidência enviada para validação do fiscal.");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao enviar."),
  });

  const aprovarMut = useMutation({
    mutationFn: () =>
      validarAtividade({
        atividadeId: current!.id,
        obraId,
        aprovar: true,
        usuarioId: user!.id,
        usuarioNome: profile?.nome || "Fiscal",
      }),
    onSuccess: () => {
      toast.success("Atividade aprovada. Avanço físico atualizado.");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reprovarMut = useMutation({
    mutationFn: () =>
      validarAtividade({
        atividadeId: current!.id,
        obraId,
        aprovar: false,
        justificativa,
        usuarioId: user!.id,
        usuarioNome: profile?.nome || "Fiscal",
      }),
    onSuccess: () => {
      toast.success("Atividade reprovada.");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const captureGps = () => {
    if (!navigator.geolocation) return toast.error("GPS indisponível.");
    navigator.geolocation.getCurrentPosition(
      (p) => setGps(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`),
      () => toast.error("Não foi possível obter a localização."),
    );
  };

  const titulo = current?.nome || fallbackNome || "Evidência";
  const podeEnviar =
    !!current &&
    canGestor &&
    (current.status === "nao_iniciada" ||
      current.status === "em_execucao" ||
      current.status === "rejeitada");
  const podeValidar = !!current && canFiscal && current.status === "aguardando_validacao";
  const sla = current ? atividadeSla(current) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" /> {titulo}
          </DialogTitle>
        </DialogHeader>

        {/* Sem atividade vinculada: oferece criar (mesma base de dados da etapa inicial) */}
        {!current ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Este item ainda não está vinculado ao cronograma da obra. Vincule-o para anexar
              evidências que aparecerão também na etapa inicial.
            </p>
            {canGestor ? (
              <Button onClick={() => criarMut.mutate()} disabled={criarMut.isPending}>
                {criarMut.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-1 h-4 w-4" />
                )}
                Vincular e anexar evidência
              </Button>
            ) : (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Apenas o responsável da obra (ou gestão) pode vincular este item.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status atual + evidência existente */}
            <div className="rounded-lg border border-border bg-background p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    ATIVIDADE_STATUS_CLASSES[current.status],
                  )}
                >
                  {ATIVIDADE_STATUS_LABELS[current.status]}
                </span>
                {sla && (
                  <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", TONE[sla.tone])}>
                    {sla.label}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Prazo: {formatDate(current.data_planejada_fim)}</span>
                {current.data_real_fim && <span>Concluída: {formatDate(current.data_real_fim)}</span>}
              </div>
              {current.evidencia_comentario && (
                <div className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Evidência: </span>
                  {current.evidencia_comentario}
                  {current.evidencia_foto && <EvidenciaLink path={current.evidencia_foto} />}
                </div>
              )}
              {current.status === "rejeitada" && current.justificativa && (
                <p className="mt-2 rounded-md bg-danger/10 px-2 py-1.5 text-xs text-danger">
                  Reprovada: {current.justificativa}
                </p>
              )}
            </div>

            {/* Gestor: enviar evidência */}
            {podeEnviar && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Foto e comentário são obrigatórios. A atividade ficará aguardando aprovação do
                  fiscal.
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
                    <Input
                      value={gps}
                      onChange={(e) => setGps(e.target.value)}
                      placeholder="lat, long"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={captureGps}>
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={enviarMut.isPending || !foto || comentario.trim().length < 3}
                  onClick={() => enviarMut.mutate()}
                >
                  {enviarMut.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="mr-1 h-4 w-4" />
                  )}
                  Enviar para validação
                </Button>
              </div>
            )}

            {/* Fiscal: aprovar / reprovar */}
            {podeValidar && !reprovando && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => aprovarMut.mutate()} disabled={aprovarMut.isPending}>
                  {aprovarMut.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                  )}
                  Aprovar
                </Button>
                <Button variant="outline" onClick={() => setReprovando(true)}>
                  <XCircle className="mr-1 h-4 w-4" /> Reprovar
                </Button>
              </div>
            )}

            {podeValidar && reprovando && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <Label className="block text-xs">Justificativa da reprovação *</Label>
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Explique o motivo da reprovação..."
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setReprovando(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={reprovarMut.isPending || justificativa.trim().length < 3}
                    onClick={() => reprovarMut.mutate()}
                  >
                    {reprovarMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Confirmar reprovação
                  </Button>
                </div>
              </div>
            )}

            {!podeEnviar && !podeValidar && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                {current.status === "aguardando_validacao"
                  ? "Aguardando validação do fiscal."
                  : current.status === "concluida"
                    ? "Atividade já validada pelo fiscal."
                    : "Sem ações disponíveis para o seu perfil neste momento."}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
