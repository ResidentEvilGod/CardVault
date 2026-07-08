import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Scroll, Trash2, Edit2, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ListingTemplates() {
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", shippingDetails: "", descriptionSnippet: "" });

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => { toast.success("Template created!"); utils.templates.list.invalidate(); setCreating(false); setForm({ name: "", shippingDetails: "", descriptionSnippet: "" }); },
    onError: () => toast.error("Failed to create template"),
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => { toast.success("Template updated!"); utils.templates.list.invalidate(); setEditingId(null); },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => { toast.success("Template deleted"); utils.templates.list.invalidate(); },
    onError: () => toast.error("Failed to delete"),
  });

  const inputStyle = {
    background: "oklch(0.18 0.03 50)",
    border: "1px solid oklch(0.35 0.06 55)",
    color: "oklch(0.92 0.04 60)",
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">Listing Templates</h1>
          <p className="text-muted-foreground text-sm">Save shipping details and description snippets for faster listings.</p>
        </div>
        <button onClick={() => { setCreating(true); setEditingId(null); }} className="btn-fantasy text-sm flex-shrink-0">
          <Plus className="w-4 h-4" />New Template
        </button>
      </div>

      {creating && (
        <div className="fantasy-card p-5 mb-6">
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">New Template</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider block mb-1">Template Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Shipping" className="w-full px-3 py-2 rounded text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider block mb-1">Shipping Info</label>
              <textarea value={form.shippingDetails} onChange={e => setForm(f => ({ ...f, shippingDetails: e.target.value }))} placeholder="e.g. Ships in toploader and bubble mailer, USPS First Class" rows={2} className="w-full px-3 py-2 rounded text-sm resize-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider block mb-1">Description Snippet</label>
              <textarea value={form.descriptionSnippet} onChange={e => setForm(f => ({ ...f, descriptionSnippet: e.target.value }))} placeholder="e.g. Fast shipping! Combined shipping available." rows={3} className="w-full px-3 py-2 rounded text-sm resize-none" style={inputStyle} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => createMutation.mutate({ name: form.name, shippingDetails: form.shippingDetails, descriptionSnippet: form.descriptionSnippet })} disabled={!form.name || createMutation.isPending} className="btn-fantasy text-sm">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
              </button>
              <button onClick={() => setCreating(false)} className="btn-arcane text-sm"><X className="w-4 h-4" />Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!templates?.length && !creating ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Scroll className="w-16 h-16 mb-4" style={{ color: "var(--gold)", opacity: 0.3 }} />
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">No templates yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Create templates to speed up your listing process.</p>
          <button onClick={() => setCreating(true)} className="btn-fantasy text-sm"><Plus className="w-4 h-4" />Create First Template</button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates?.map((t) => (
            <div key={t.id} className="fantasy-card p-5">
              {editingId === t.id ? (
                <div className="space-y-3">
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded text-sm" style={inputStyle} />
                  <textarea value={form.shippingDetails} onChange={e => setForm(f => ({ ...f, shippingDetails: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded text-sm resize-none" style={inputStyle} />
                  <textarea value={form.descriptionSnippet} onChange={e => setForm(f => ({ ...f, descriptionSnippet: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded text-sm resize-none" style={inputStyle} />
                  <div className="flex gap-2">
                    <button onClick={() => updateMutation.mutate({ id: t.id, name: form.name, shippingDetails: form.shippingDetails, descriptionSnippet: form.descriptionSnippet })} disabled={updateMutation.isPending} className="btn-fantasy text-sm">
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-arcane text-sm"><X className="w-4 h-4" />Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading text-base font-semibold" style={{ color: "var(--gold)" }}>{t.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(t.id); setForm({ name: t.name, shippingDetails: t.shippingDetails ?? "", descriptionSnippet: t.descriptionSnippet ?? "" }); setCreating(false); }} className="p-1.5 rounded" style={{ background: "oklch(0.20 0.04 55 / 0.3)", color: "oklch(0.65 0.05 55)" }}><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteMutation.mutate({ id: t.id })} className="p-1.5 rounded" style={{ background: "oklch(0.18 0.04 25 / 0.3)", color: "oklch(0.55 0.22 25)" }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {t.shippingDetails && <div className="mb-2"><span className="text-xs font-heading text-muted-foreground uppercase tracking-wider">Shipping: </span><span className="text-sm text-muted-foreground">{t.shippingDetails}</span></div>}
                  {t.descriptionSnippet && <div><span className="text-xs font-heading text-muted-foreground uppercase tracking-wider">Snippet: </span><span className="text-sm text-muted-foreground">{t.descriptionSnippet}</span></div>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
