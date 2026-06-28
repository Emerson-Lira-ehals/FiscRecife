import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AuthRequired } from "@/components/AuthRequired";
import { useAuth } from "@/lib/auth";
import { createObra, uploadObraFoto, type NovaObraInput } from "@/lib/queries";
import { STATUS_LABELS } from "@/lib/obra-utils";
import type { ObraStatus } from "@/lib/obra-utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/obras/nova")({
  head: () => ({ meta: [{ title: "Cadastrar Nova Obra — FiscRecife" }] }),
  component: () => (
    <AuthRequired requireRole="prefeitura">
      <NovaObra />
    </AuthRequired>
  ),
});

interface FotoPreview {
  file: File;
  url: string;
}

const STATUS_OPTIONS: ObraStatus[] = [
  "planejamento",
  "licitacao",
  "em_andamento",
  "atrasada",
  "paralisada",
  "concluida",
  "cancelada",
];

function NovaObra() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  const [municipio, setMunicipio] = useState("Recife");
  const [estado, setEstado] = useState("PE");
  const [empreiteira, setEmpreiteira] = useState("");
  const [orgao, setOrgao] = useState("");
  const [status, setStatus] = useState<ObraStatus>("planejamento");
  const [valorPrevisto, setValorPrevisto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fotos, setFotos] = useState<FotoPreview[]>([]);

  const valido = useMemo(
    () =>
      nome.trim().length >= 3 &&
      endereco.trim().length > 0 &&
      municipio.trim().length > 0 &&
      estado.trim().length > 0 &&
      Number(valorPrevisto) > 0 &&
      dataInicio !== "" &&
      dataPrevista !== "",
    [nome, endereco, municipio, estado, valorPrevisto, dataInicio, dataPrevista],
  );

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length !== files.length) toast.error("Apenas imagens são permitidas.");
    setFotos((prev) => [...prev, ...imgs.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function removeFoto(idx: number) {
    setFotos((prev) => {
      const f = prev[idx];
      if (f) URL.revokeObjectURL(f.url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const paths: string[] = [];
      for (const f of fotos) {
        paths.push(await uploadObraFoto(f.file));
      }
      const input: NovaObraInput = {
        nome,
        endereco,
        bairro: bairro.trim() || municipio,
        cep,
        municipio,
        estado,
        empreiteira,
        orgao_responsavel: orgao,
        descricao,
        status,
        valor_previsto: Number(valorPrevisto) || 0,
        valor_executado: Number(valorGasto) || 0,
        data_inicio: dataInicio || null,
        data_prevista: dataPrevista || null,
      };
      return createObra(input, paths, {
        id: user?.id ?? null,
        nome: profile?.nome ?? "Prefeitura",
      });
    },
    onSuccess: (obra) => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["orcamento-todos"] });
      toast.success("Obra cadastrada com sucesso!");
      navigate({ to: "/obras/$id", params: { id: obra.id } });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Falha ao cadastrar a obra.");
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-foreground">Cadastrar Nova Obra</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Preencha os dados abaixo. Os campos marcados com * são obrigatórios.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valido && !mutation.isPending) mutation.mutate();
        }}
        className="space-y-6"
      >
        <Section title="Informações básicas">
          <Field label="Nome da obra *" full>
            <input className="ff" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Hospital Recife Norte" />
          </Field>
          <Field label="Endereço completo *" full>
            <input className="ff" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, complemento" />
          </Field>
          <Field label="Bairro">
            <input className="ff" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </Field>
          <Field label="CEP">
            <input className="ff" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
          </Field>
          <Field label="Município *">
            <input className="ff" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
          </Field>
          <Field label="Estado *">
            <input className="ff" value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} />
          </Field>
        </Section>

        <Section title="Informações financeiras e prazos">
          <Field label="Valor previsto (R$) *">
            <input className="ff" type="number" min="0" step="1000" value={valorPrevisto} onChange={(e) => setValorPrevisto(e.target.value)} />
          </Field>
          <Field label="Valor já gasto (R$)">
            <input className="ff" type="number" min="0" step="1000" value={valorGasto} onChange={(e) => setValorGasto(e.target.value)} />
          </Field>
          <Field label="Data de início *">
            <input className="ff" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </Field>
          <Field label="Prazo previsto (término) *">
            <input className="ff" type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
          </Field>
        </Section>

        <Section title="Informações complementares">
          <Field label="Empreiteira responsável">
            <input className="ff" value={empreiteira} onChange={(e) => setEmpreiteira(e.target.value)} />
          </Field>
          <Field label="Órgão responsável">
            <input className="ff" value={orgao} onChange={(e) => setOrgao(e.target.value)} />
          </Field>
          <Field label="Situação inicial">
            <select className="ff" value={status} onChange={(e) => setStatus(e.target.value as ObraStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Imagens da obra">
          <div className="sm:col-span-2">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card py-6 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <ImagePlus className="h-5 w-5" /> Adicionar imagens (múltiplas)
            </button>
            {fotos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {fotos.map((f, i) => (
                  <div key={f.url} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={f.url} alt={`Pré-visualização ${i + 1}`} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFoto(i)}
                      aria-label="Remover imagem"
                      className="absolute right-1 top-1 rounded-full bg-foreground/70 p-1 text-background transition hover:bg-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-primary/80 py-0.5 text-center text-[10px] font-semibold text-primary-foreground">
                        Capa
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Descrição">
          <Field label="Descrição detalhada da obra" full>
            <textarea
              className="ff min-h-32 resize-y"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Objetivo, escopo, benefícios para a população..."
            />
          </Field>
        </Section>

        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="outline" type="button">
            <Link to="/">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={!valido || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Cadastrar Obra
          </Button>
        </div>
      </form>

      <style>{`.ff{width:100%;border-radius:0.6rem;border:1px solid var(--border);background:var(--card);padding:0.55rem 0.75rem;font-size:0.875rem;color:var(--foreground);outline:none}.ff:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklch,var(--primary) 18%,transparent)}`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <legend className="px-2 text-sm font-semibold text-foreground">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={full ? "sm:col-span-2" : undefined}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
