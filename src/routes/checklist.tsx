import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  FileSpreadsheet,
  Lock,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AuthRequired } from "@/components/AuthRequired";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  SAMPLE_TASKS,
  buildHierarchy,
  globalProgress,
  macroProgress,
  nextStatus,
  parseSpreadsheet,
  type Progress,
  type Task,
  type TaskStatus,
} from "@/lib/checklist-tasks";

export const Route = createFileRoute("/checklist")({
  head: () => ({
    meta: [
      { title: "FiscRecife — Checklist de Obra" },
      {
        name: "description",
        content:
          "Acompanhamento físico de obras públicas de Recife. Importe cronogramas, marque etapas e alimente os indicadores em tempo real.",
      },
      { property: "og:title", content: "FiscRecife — Checklist de Obra" },
      {
        property: "og:description",
        content:
          "Acompanhamento físico de obras públicas de Recife. Importe cronogramas, marque etapas e alimente os indicadores em tempo real.",
      },
    ],
  }),
  component: () => (
    <AuthRequired>
      <Checklist />
    </AuthRequired>
  ),
});

type Profile = "fiscal" | "responsavel";

function Checklist() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [profile, setProfile] = useState<Profile>("fiscal");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SAMPLE_TASKS.filter((t) => t.level === 0).map((t) => [t.id, true])),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const macros = useMemo(() => tasks.filter((t) => t.level === 0), [tasks]);
  const global = useMemo(() => globalProgress(tasks), [tasks]);

  const q = query.trim().toLowerCase();
  const matches = (t: Task) =>
    !q ||
    t.name.toLowerCase().includes(q) ||
    t.idt.includes(q) ||
    (t.responsible ?? "").toLowerCase().includes(q);

  function toggleStatus(task: Task) {
    const ns = nextStatus(task.status, profile);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: ns,
              updatedAt: new Date().toISOString().slice(0, 10),
              updatedBy: profile === "fiscal" ? "Fiscal" : "Responsável",
            }
          : t,
      ),
    );
  }

  function toggleExpand(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  function setAllExpanded(value: boolean) {
    setExpanded(Object.fromEntries(macros.map((m) => [m.id, value])));
    setMenuOpen(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const rows = await parseSpreadsheet(file);
      const next = buildHierarchy(rows);
      setTasks(next);
      setExpanded(Object.fromEntries(next.filter((t) => t.level === 0).map((t) => [t.id, true])));
      toast.success(`Cronograma importado: ${next.filter((t) => t.isLeaf).length} micro etapas.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao ler o arquivo.");
    }
  }

  function addTask(macroIdt: string, name: string, responsible: string, notes: string) {
    const siblings = tasks.filter((t) => t.parentId === macroIdt);
    const nextNum = siblings.length + 1;
    const idt = `${macroIdt}.${nextNum}`;
    const raw = tasks.map((t) => ({
      idt: t.idt,
      name: t.name,
      status: t.status,
      responsible: t.responsible,
      notes: t.notes,
    }));
    raw.push({ idt, name, status: "pending", responsible: responsible || undefined, notes: notes || undefined });
    const rebuilt = buildHierarchy(raw).map((t) => {
      const old = tasks.find((o) => o.idt === t.idt);
      return old ? { ...t, updatedAt: old.updatedAt, updatedBy: old.updatedBy } : t;
    });
    setTasks(rebuilt);
    toast.success("Tarefa adicionada.");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFile}
      />

      {/* Cabeçalho */}
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground">Obra · Hospital Recife Norte</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Checklist da Obra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {global.done} de {global.total} atividades concluídas · {global.pct}% de avanço físico
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Switch de perfil */}
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
            {(["fiscal", "responsavel"] as Profile[]).map((p) => (
              <button
                key={p}
                onClick={() => setProfile(p)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition",
                  profile === p
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p === "fiscal" ? "Fiscal" : "Responsável"}
              </button>
            ))}
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]"
            style={{ background: "var(--gradient-sky)" }}
          >
            <FileSpreadsheet className="h-4 w-4" /> Importar Cronograma
          </button>

          <button
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40"
          >
            <Plus className="h-4 w-4" /> Nova Tarefa
          </button>

          <button
            onClick={() => setCopyOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40"
          >
            <Copy className="h-4 w-4" /> Copiar de Outra Obra
          </button>

          {/* Menu ⋮ */}
          <div className="relative ml-auto">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Mais opções"
              className="rounded-xl border border-border bg-card p-2.5 text-foreground transition hover:border-primary/40"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-[var(--shadow-lift)]"
                  >
                    <MenuItem
                      onClick={() => {
                        setTasks(SAMPLE_TASKS);
                        setExpanded(
                          Object.fromEntries(SAMPLE_TASKS.filter((t) => t.level === 0).map((t) => [t.id, true])),
                        );
                        setMenuOpen(false);
                        toast.success("Dados de exemplo restaurados.");
                      }}
                    >
                      Restaurar dados de exemplo
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setTasks([]);
                        setMenuOpen(false);
                        toast.success("Checklist limpo.");
                      }}
                    >
                      Limpar checklist
                    </MenuItem>
                    <MenuItem onClick={() => setAllExpanded(false)}>Recolher todos</MenuItem>
                    <MenuItem onClick={() => setAllExpanded(true)}>Expandir todos</MenuItem>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar tarefa, IDT ou responsável..."
          className="h-12 w-full rounded-xl border-2 border-border bg-card pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
      </div>

      {/* Macro etapas */}
      <div className="flex flex-col gap-3">
        {macros.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhuma tarefa. Importe um cronograma ou restaure os dados de exemplo.
          </div>
        )}
        {macros.map((macro) => {
          const children = tasks
            .filter((t) => t.parentId === macro.id)
            .filter((t) => matches(t));
          if (q && children.length === 0 && !matches(macro)) return null;
          const prog = macroProgress(tasks, macro.idt);
          const open = expanded[macro.id] ?? false;
          return (
            <MacroCard
              key={macro.id}
              macro={macro}
              prog={prog}
              open={open}
              onToggle={() => toggleExpand(macro.id)}
              children={children}
              profile={profile}
              onToggleStatus={toggleStatus}
            />
          );
        })}
      </div>

      {newOpen && (
        <NewTaskModal macros={macros} onClose={() => setNewOpen(false)} onCreate={addTask} />
      )}
      {copyOpen && <CopyModal onClose={() => setCopyOpen(false)} />}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full px-4 py-2.5 text-left text-sm text-popover-foreground transition hover:bg-secondary"
    >
      {children}
    </button>
  );
}

function MacroCard({
  macro,
  prog,
  open,
  onToggle,
  children,
  profile,
  onToggleStatus,
}: {
  macro: Task;
  prog: { pct: number; done: number; total: number };
  open: boolean;
  onToggle: () => void;
  children: Task[];
  profile: Profile;
  onToggleStatus: (t: Task) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <button onClick={onToggle} className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5">
        <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
          {macro.idt}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-tight text-foreground">{macro.name}</p>
          <p className="text-xs text-muted-foreground">
            {prog.done} de {prog.total} micro etapas concluídas
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--gradient-sky)" }}
              initial={false}
              animate={{ width: `${prog.pct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
        <span className="text-xl font-bold text-primary">{prog.pct}%</span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {children.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">Nenhuma micro etapa.</p>
              ) : (
                children.map((task) => (
                  <TaskRow key={task.id} task={task} profile={profile} onToggle={onToggleStatus} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBox({ status, onClick }: { status: TaskStatus; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Alterar status"
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition",
        status === "pending" && "border-border bg-background hover:border-primary/50",
        status === "fiscal" && "border-success bg-success text-success-foreground",
        status === "validated" && "border-warning bg-warning text-warning-foreground",
      )}
    >
      {status === "fiscal" && <Check className="h-4 w-4" strokeWidth={3} />}
      {status === "validated" && <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />}
    </button>
  );
}

function TaskRow({
  task,
  profile,
  onToggle,
}: {
  task: Task;
  profile: Profile;
  onToggle: (t: Task) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
      <StatusBox status={task.status} onClick={() => onToggle(task)} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">{task.idt}</span>
          <span className="truncate text-sm font-medium text-foreground">{task.name}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
          {task.responsible && <span>Resp.: {task.responsible}</span>}
          {task.updatedAt && (
            <span>
              {task.updatedBy} · {task.updatedAt}
            </span>
          )}
          {task.notes && <span className="italic">{task.notes}</span>}
        </div>
      </div>
      <button
        aria-label="Anexar"
        className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        <Paperclip className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lift)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function NewTaskModal({
  macros,
  onClose,
  onCreate,
}: {
  macros: Task[];
  onClose: () => void;
  onCreate: (macroIdt: string, name: string, responsible: string, notes: string) => void;
}) {
  const [macroId, setMacroId] = useState(macros[0]?.id ?? "");
  const [name, setName] = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    if (!macroId || !name.trim()) {
      toast.error("Selecione a macro-etapa e informe o nome.");
      return;
    }
    onCreate(macroId, name.trim(), responsible.trim(), notes.trim());
    onClose();
  }

  return (
    <ModalShell title="Nova Tarefa" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Macro-etapa</label>
          <select value={macroId} onChange={(e) => setMacroId(e.target.value)} className="input">
            {macros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.idt} — {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome da tarefa</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ex.: Reboco interno" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Responsável</label>
          <input value={responsible} onChange={(e) => setResponsible(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Observações</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input resize-none" />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40">
          Cancelar
        </button>
        <button
          onClick={submit}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
          style={{ background: "var(--gradient-sky)" }}
        >
          Criar
        </button>
      </div>
    </ModalShell>
  );
}

const OBRAS_DISPONIVEIS = [
  "Hospital Recife Norte",
  "Escola Municipal Boa Vista",
  "Requalificação da Av. Caxangá",
  "UPA Cordeiro",
];

function CopyModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState(OBRAS_DISPONIVEIS[0]);
  return (
    <ModalShell title="Copiar de Outra Obra" onClose={onClose}>
      <p className="mb-3 text-sm text-muted-foreground">
        Selecione a obra cujo checklist servirá de base.
      </p>
      <div className="space-y-2">
        {OBRAS_DISPONIVEIS.map((o) => (
          <label
            key={o}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition",
              selected === o ? "border-primary bg-accent" : "border-border hover:border-primary/40",
            )}
          >
            <input
              type="radio"
              name="obra"
              checked={selected === o}
              onChange={() => setSelected(o)}
              className="accent-primary"
            />
            <span className="text-foreground">{o}</span>
          </label>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40">
          Cancelar
        </button>
        <button
          onClick={() => {
            toast.success(`Checklist copiado de "${selected}".`);
            onClose();
          }}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
          style={{ background: "var(--gradient-sky)" }}
        >
          <Upload className="h-4 w-4" /> Confirmar cópia
        </button>
      </div>
    </ModalShell>
  );
}
