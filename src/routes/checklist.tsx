import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardCheck, Loader2, Plus, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { fetchObras, fetchChecklists, logAuditoria } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AuthRequired } from "@/components/AuthRequired";
import { formatDate, ROLE_LABELS } from "@/lib/obra-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checklist")({
  head: () => ({ meta: [{ title: "Checklist Fiscal — Recife Obras" }] }),
  component: () => (
    <AuthRequired>
      <Checklist />
    </AuthRequired>
  ),
});

const ITENS = [
  "Segurança do canteiro",
  "Uso de EPIs",
  "Sinalização",
  "Limpeza",
  "Conformidade do cronograma",
  "Qualidade da execução",
  "Conformidade documental",
];

type ItemStatus = "conforme" | "nao_conforme" | "observacao";

interface ItemResultado {
  item: string;
  status: ItemStatus;
  observacao: string;
}

const STATUS_OPTS: { value: ItemStatus; label: string; cls: string }[] = [
  { value: "conforme", label: "Conforme", cls: "bg-success/15 text-success border-success/40" },
  { value: "nao_conforme", label: "Não Conforme", cls: "bg-danger/10 text-danger border-danger/40" },
  { value: "observacao", label: "Observação", cls: "bg-warning/15 text-warning border-warning/40" },
];

function Checklist() {
  const qc = useQueryClient();
  const { role, user, profile } = useAuth();
  const obrasQ = useQuery({ queryKey: ["obras"], queryFn: fetchObras });
  const checklistsQ = useQuery({ queryKey: ["checklists"], queryFn: fetchChecklists });
  const obras = obrasQ.data ?? [];

  const canCreate = role === "fiscal";

  const [obraId, setObraId] = useState<string>("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<ItemResultado[]>(
    ITENS.map((item) => ({ item, status: "conforme", observacao: "" })),
  );
  const [obsGeral, setObsGeral] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);

  const obraNome = (id: string) => obras.find((o) => o.id === id)?.nome ?? "Obra";

  function setItem(idx: number, patch: Partial<ItemResultado>) {
    setResultado((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function uploadAll(list: File[], prefix: string): Promise<string[]> {
    const paths: string[] = [];
    for (const file of list) {
      const path = `${user!.id}/${Date.now()}-${prefix}-${file.name}`;
      const { error } = await supabase.storage.from("fiscalizacao").upload(path, file);
      if (error) throw new Error(error.message);
      paths.push(path);
    }
    return paths;
  }

  const createMut = useMutation({
    mutationFn: async () => {
      if (!obraId) throw new Error("Selecione uma obra");
      const fotos = await uploadAll(files, "foto");
      const documentos = await uploadAll(docs, "doc");
      const { error } = await supabase.from("checklist_fiscal").insert({
        obra_id: obraId,
        fiscal_id: user!.id,
        data_inspecao: data,
        resultado: resultado as unknown as Json,
        observacao_geral: obsGeral.trim(),
        fotos: fotos as unknown as Json,
        documentos: documentos as unknown as Json,
      });
      if (error) throw new Error(error.message);
      await logAuditoria(obraId, "Registrou inspeção fiscal", "checklist_fiscal", user!.id, profile?.nome || "Fiscal");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklists"] });
      setObraId("");
      setObsGeral("");
      setFiles([]);
      setDocs([]);
      setResultado(ITENS.map((item) => ({ item, status: "conforme", observacao: "" })));
      toast.success("Inspeção registrada com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível registrar."),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <ClipboardCheck className="h-6 w-6 text-primary" /> Checklist Fiscal
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro e acompanhamento das inspeções de fiscalização.
        </p>
      </div>

      {canCreate ? (
        <section className="mb-8 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Plus className="h-5 w-5 text-primary" /> Nova inspeção
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div>
              <Label className="mb-1.5 block text-xs">Data da inspeção</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {resultado.map((r, idx) => (
              <div key={r.item} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{r.item}</span>
                  <div className="flex gap-1.5">
                    {STATUS_OPTS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setItem(idx, { status: opt.value })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition",
                          r.status === opt.value
                            ? opt.cls
                            : "border-border bg-background text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {r.status !== "conforme" && (
                  <Input
                    value={r.observacao}
                    onChange={(e) => setItem(idx, { observacao: e.target.value })}
                    placeholder="Observação..."
                    className="mt-2"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Label className="mb-1.5 block text-xs">Observação geral</Label>
            <Textarea value={obsGeral} onChange={(e) => setObsGeral(e.target.value)} rows={2} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FileInput
              label="Fotos"
              icon={Upload}
              accept="image/*"
              files={files}
              onChange={setFiles}
            />
            <FileInput
              label="Documentos"
              icon={FileText}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              files={docs}
              onChange={setDocs}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <Button disabled={!obraId || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="mr-1 h-4 w-4" />
              )}
              Registrar inspeção
            </Button>
          </div>
        </section>
      ) : (
        <p className="mb-8 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Conectado como <strong>{role ? ROLE_LABELS[role] : ""}</strong>. Apenas fiscais de obra
          podem registrar novas inspeções. Abaixo você acompanha as inspeções realizadas.
        </p>
      )}

      <section>
        <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
          Inspeções realizadas
        </h2>
        {checklistsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (checklistsQ.data ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhuma inspeção registrada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {(checklistsQ.data ?? []).map((c) => {
              const items = (c.resultado as unknown as ItemResultado[]) ?? [];
              const naoConf = items.filter((i) => i.status === "nao_conforme").length;
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{obraNome(c.obra_id)}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(c.data_inspecao)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((i) => {
                      const opt = STATUS_OPTS.find((o) => o.value === i.status)!;
                      return (
                        <span key={i.item} className={cn("rounded-full border px-2 py-0.5 text-[11px]", opt.cls)}>
                          {i.item}
                        </span>
                      );
                    })}
                  </div>
                  {naoConf > 0 && (
                    <p className="mt-2 text-xs font-medium text-danger">
                      {naoConf} item(ns) não conforme(s)
                    </p>
                  )}
                  {c.observacao_geral && (
                    <p className="mt-2 text-sm text-muted-foreground">{c.observacao_geral}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function FileInput({
  label,
  icon: Icon,
  accept,
  files,
  onChange,
}: {
  label: string;
  icon: typeof Upload;
  accept: string;
  files: File[];
  onChange: (f: File[]) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2.5 text-sm text-muted-foreground transition hover:border-primary/40">
        <Icon className="h-4 w-4" />
        <span>{files.length > 0 ? `${files.length} arquivo(s)` : "Selecionar arquivos"}</span>
        <input
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(Array.from(e.target.files ?? []))}
        />
      </label>
    </div>
  );
}
