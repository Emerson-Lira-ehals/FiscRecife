import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileUp,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { parseCronograma, ImportError, type ImportResult } from "@/lib/cronograma-import";
import { importarCronograma } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ObraOption {
  id: string;
  nome: string;
}

export function ImportarCronograma({
  obras,
  obraId: fixedObraId,
  trigger,
}: {
  obras: ObraOption[];
  /** Quando informado, fixa a obra (uso na página de detalhe). */
  obraId?: string;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [obraId, setObraId] = useState(fixedObraId ?? "");
  const [substituir, setSubstituir] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setResult(null);
    setFileName("");
    setExpandido({});
    if (!fixedObraId) setObraId("");
    if (inputRef.current) inputRef.current.value = "";
  };

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setResult(null);
    setFileName(file.name);
    try {
      const r = await parseCronograma(file);
      setResult(r);
      // expande tudo por padrão
      setExpandido(Object.fromEntries(r.macros.map((m) => [m.nome, true])));
    } catch (err) {
      const msg = err instanceof ImportError ? err.message : "Não foi possível ler o arquivo.";
      toast.error(msg);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setParsing(false);
    }
  }

  const importMut = useMutation({
    mutationFn: async () => {
      if (!obraId) throw new Error("Selecione a obra.");
      if (!result) throw new Error("Envie um arquivo de planejamento.");
      await importarCronograma({
        obraId,
        atividades: result.flat,
        substituir,
        usuarioId: user!.id,
        usuarioNome: profile?.nome || "Gestor",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atividades", obraId] });
      qc.invalidateQueries({ queryKey: ["obra", obraId] });
      qc.invalidateQueries({ queryKey: ["obras"] });
      qc.invalidateQueries({ queryKey: ["auditoria", obraId] });
      toast.success(`Checklist gerado: ${result?.totalMicros} micro etapas em ${result?.totalMacros} macro etapas.`);
      reset();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <FileUp className="mr-1.5 h-4 w-4" /> Importar planejamento
          </Button>
        )}
      </span>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Importar planejamento da obra
          </DialogTitle>
          <DialogDescription>
            Envie o cronograma em <strong>Excel (.xlsx)</strong> ou <strong>XML do MS Project</strong>. O
            sistema lê o IDT, identifica macro e micro etapas e gera o checklist automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!fixedObraId && (
            <div>
              <Label className="mb-1.5 block text-xs">Obra</Label>
              <Select value={obraId} onValueChange={setObraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a obra" />
                </SelectTrigger>
                <SelectContent>
                  {obras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-xs">Arquivo de planejamento</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground transition hover:border-primary/40">
              {parsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              <span className="truncate">
                {fileName || "Selecionar arquivo (.xlsx, .xml, .mpp)"}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.xml,.mpp"
                className="hidden"
                onChange={handleFile}
              />
            </label>
            <p className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              Arquivos .mpp binários do Project devem ser exportados para .xlsx ou XML antes do upload.
            </p>
          </div>

          {result && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <ListChecks className="h-3.5 w-3.5 text-primary" />
                  {result.totalMacros} macro etapas
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {result.totalMicros} micro etapas (marcáveis)
                </span>
              </div>

              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {result.macros.map((m) => {
                  const aberto = expandido[m.nome] ?? true;
                  return (
                    <div key={m.nome} className="rounded-md border border-border bg-card">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandido((p) => ({ ...p, [m.nome]: !aberto }))
                        }
                        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          {aberto ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {m.nome}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {m.micros.length} {m.micros.length === 1 ? "etapa" : "etapas"}
                        </span>
                      </button>
                      {aberto && (
                        <ul className="border-t border-border px-3 py-1.5">
                          {m.micros.map((mi) => (
                            <li
                              key={mi.nome + mi.ordem}
                              className="flex items-center gap-2 py-1 text-xs text-muted-foreground"
                            >
                              <span className="h-3 w-3 shrink-0 rounded-[3px] border border-border" />
                              {mi.nome}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <Label className="text-sm">Substituir cronograma atual</Label>
              <p className="text-[11px] text-muted-foreground">
                Remove o checklist existente da obra antes de importar.
              </p>
            </div>
            <Switch checked={substituir} onCheckedChange={setSubstituir} />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={!obraId || !result || importMut.isPending}
            onClick={() => importMut.mutate()}
          >
            {importMut.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-4 w-4" />
            )}
            Gerar checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
