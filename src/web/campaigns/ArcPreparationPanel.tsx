import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SystemRef } from "../../domain/systems/system-catalog";
import type { CampaignClient } from "../../infrastructure/browser/campaign-client";
import type { CampaignDto, PreparedEntityDto } from "../../shared/contracts/campaigns";
import { ServiceDialog } from "../dialogs";
import { HeaderDropdown } from "../HeaderDropdown";
import { SearchableSelect } from "../../renderer/src/components/ui/SearchableSelect";
import { failureMessage } from "../service-model";

type PreparedKind = "monster" | "npc";
type TemplateChoice = { readonly id: string; readonly name: string };
type FormState = { readonly item?: PreparedEntityDto };
const pageSize = 50;

function labelFor(kind: PreparedKind): string { return kind === "npc" ? "NPCs" : "Monstruos"; }
function singularFor(kind: PreparedKind): string { return kind === "npc" ? "NPC" : "monstruo"; }
function imagePath(value: string | null): string | undefined { return value?.startsWith("asset:") ? `/api/v1/dm/assets/${value.slice(6)}` : undefined; }
function summary(value: string): string { const normalized = value.replace(/\s+/g, " ").trim(); return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}…` : normalized; }
function isConflict(cause: unknown): boolean { return typeof cause === "object" && cause !== null && "status" in cause && (cause as { readonly status?: unknown }).status === 409; }

export function ArcPreparationPanel({ client, campaign, arcId, kind, templates, accountId, onBack }: {
  readonly client: CampaignClient;
  readonly campaign: CampaignDto;
  readonly arcId: string;
  readonly kind: PreparedKind;
  readonly accountId?: string;
  readonly templates: readonly TemplateChoice[];
  readonly onBack: () => void;
}) {
  const [items, setItems] = useState<readonly PreparedEntityDto[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PreparedEntityDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const request = useRef(0);
  const rows = useRef(new Map<string, HTMLElement>());
  const actionTargets = useRef(new Map<string, HTMLElement>());
  const [focusActionId, setFocusActionId] = useState<string | null>(null);
  const inactive = campaign.state === "inactive";
  const title = labelFor(kind);
  const singular = singularFor(kind);
  const noTemplates = kind === "monster" && templates.length === 0;
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError("");
    try {
      const page = await client.listPreparation(campaign.id, arcId, { kind, limit: pageSize, offset });
      if (request.current !== current) return;
      setItems(page.items); setTotal(page.total);
    } catch (cause) { if (request.current === current) setError(failureMessage(cause)); }
    finally { if (request.current === current) setLoading(false); }
  }, [arcId, campaign.id, client, kind, offset]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load, accountId]);
  useEffect(() => { setOffset(0); setForm(null); setDeleteTarget(null); setDeleteError(""); setFocusId(null); }, [accountId, arcId, campaign.id, kind]);
  useEffect(() => {
    if (!focusActionId) return;
    queueMicrotask(() => { actionTargets.current.get(focusActionId)?.querySelector<HTMLElement>("summary")?.focus(); setFocusActionId(null); });
  }, [focusActionId, items]);
  useEffect(() => {
    if (!focusId) return;
    const frame = requestAnimationFrame(() => { const row = rows.current.get(focusId); if (row) row.focus(); else document.querySelector<HTMLElement>(".campaign-preparation h1")?.focus(); setFocusId(null); });
    return () => cancelAnimationFrame(frame);
  }, [focusId, items]);
  const afterSaved = (saved: PreparedEntityDto, existing?: PreparedEntityDto) => {
    setItems(previous => existing ? previous.map(item => item.id === saved.id ? saved : item) : [saved, ...previous].slice(0, pageSize));
    setTotal(value => existing ? value : value + 1); setForm(null); if (existing) setFocusActionId(existing.id); else setFocusId(saved.id);
  };
  const remove = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true); setDeleteError("");
    try {
      await client.deletePreparation(campaign.id, arcId, deleteTarget.id, deleteTarget.revision);
      const index = items.findIndex(item => item.id === deleteTarget.id);
      const replacement = items[index + 1] ?? items[index - 1];
      setDeleteTarget(null); setItems(previous => previous.filter(item => item.id !== deleteTarget.id)); setTotal(value => Math.max(0, value - 1));
      if (items.length === 1 && offset > 0) setOffset(value => Math.max(0, value - pageSize));
      else setFocusId(replacement?.id ?? "__title__");
    } catch (cause) { setDeleteError(failureMessage(cause)); }
    finally { setDeleteBusy(false); }
  };
  return <section className="campaign-preparation" aria-labelledby="arc-preparation-title">
    <div className="campaign-page-heading"><div><h1 id="arc-preparation-title" tabIndex={-1}>{title}</h1><p>Preparación permanente de este arco. Usar una ficha en una escena crea una instancia independiente.</p></div><div className="campaign-heading-actions"><button onClick={onBack}>Volver a escenas</button>{!inactive && <button disabled={noTemplates} aria-describedby={noTemplates ? "missing-monster-templates" : undefined} onClick={() => setForm({})}>Agregar {singular}</button>}</div></div>
    {inactive && <p className="campaign-readonly">La campaña está inactiva. Puedes consultar las fichas, pero no prepararlas, editarlas ni borrarlas.</p>}
    {!inactive && noTemplates && <p id="missing-monster-templates" className="campaign-readonly">No hay plantillas habilitadas para el sistema de esta campaña. Agregar monstruos estará disponible cuando exista una plantilla; las fichas existentes aún se pueden editar.</p>}
    {error && <p className="campaign-error" role="alert">{error} <button onClick={() => void load()}>Reintentar</button></p>}
    {loading ? <p role="status">Cargando {title.toLocaleLowerCase()}…</p> : items.length === 0 && error ? null : items.length === 0 ? <section className="campaign-empty"><p>No hay {kind === "npc" ? title : title.toLocaleLowerCase()} preparados en este arco.</p>{!inactive && !noTemplates && <button onClick={() => setForm({})}>Agregar {singular}</button>}</section> : <ul className="campaign-preparation-list" aria-label={title}>{items.map(item => <PreparationRow key={item.id} item={item} templates={templates} inactive={inactive} rowRef={node => { if (node) rows.current.set(item.id, node); else rows.current.delete(item.id); }} actionRef={node => { if (node) actionTargets.current.set(item.id, node); else actionTargets.current.delete(item.id); }} onEdit={() => setForm({ item })} onDelete={() => { setDeleteError(""); setDeleteTarget(item); }}/>)}</ul>}
    {total > pageSize && <nav className="campaign-page-nav" aria-label={`Páginas de ${title.toLocaleLowerCase()}`}><button disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - pageSize))}>Anterior</button><span>Página {Math.floor(offset / pageSize) + 1}</span><button disabled={offset + pageSize >= total} onClick={() => setOffset(value => value + pageSize)}>Siguiente</button></nav>}
    {form && <PreparationForm client={client} campaignId={campaign.id} arcId={arcId} systemRef={campaign.systemRef} templates={templates} kind={kind} current={form.item} onClose={() => setForm(null)} onSaved={saved => afterSaved(saved, form.item)}/>}
    {deleteTarget && <ServiceDialog title={`Borrar ${deleteTarget.name}`} onCancel={() => { if (!deleteBusy) setDeleteTarget(null); }}><p>Borrar {deleteTarget.name} del catálogo de este arco. Las copias ya utilizadas en escenas se conservarán.</p>{deleteError && <p role="alert">{deleteError} <button type="button" disabled={deleteBusy} onClick={() => { setDeleteTarget(null); void load(); }}>Recargar lista</button></p>}<footer><button type="button" autoFocus disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>Cancelar</button><button type="button" disabled={deleteBusy} onClick={() => void remove()}>{deleteBusy ? "Borrando…" : `Borrar ${singular}`}</button></footer></ServiceDialog>}
  </section>;
}

function PreparationRow({ item, templates, inactive, rowRef, actionRef, onEdit, onDelete }: { readonly item: PreparedEntityDto; readonly templates: readonly TemplateChoice[]; readonly inactive: boolean; readonly rowRef: (node: HTMLElement | null) => void; readonly actionRef: (node: HTMLElement | null) => void; readonly onEdit: () => void; readonly onDelete: () => void }) {
  const templateName = item.kind === "monster" ? templates.find(template => template.id === item.templateId)?.name : undefined;
  const src = imagePath(item.imagePath);
  return <li><article ref={rowRef} tabIndex={-1} className="campaign-preparation-row">{src ? <img className="campaign-preparation-thumbnail" src={src} alt=""/> : <div className="campaign-preparation-thumbnail campaign-preparation-thumbnail--empty" aria-label={`Sin imagen para ${item.name}`}>{item.kind === "npc" ? "NPC" : "M"}</div>}<div className="campaign-preparation-details"><h2>{item.name}</h2>{item.notes && <p>{summary(item.notes)}</p>}{item.provenance && <p className="campaign-preparation-meta">Procede de una escena anterior.</p>}{item.kind === "monster" && <p className="campaign-preparation-meta">{templateName ? `Plantilla: ${templateName}` : "Plantilla retenida"}</p>}</div>{!inactive && <span ref={actionRef}><HeaderDropdown className="campaign-preparation-actions" title={`Acciones de ${item.name}`} label={<MoreHorizontal size={18} aria-hidden="true"/>}><button type="button" onClick={onEdit}><Pencil size={15} aria-hidden="true"/>Editar</button><button type="button" onClick={onDelete}><Trash2 size={15} aria-hidden="true"/>Borrar</button></HeaderDropdown></span>}</article></li>;
}

function PreparationForm({ client, campaignId, arcId, systemRef, templates, kind, current, onClose, onSaved }: { readonly client: CampaignClient; readonly campaignId: string; readonly arcId: string; readonly systemRef: SystemRef; readonly templates: readonly TemplateChoice[]; readonly kind: PreparedKind; readonly current?: PreparedEntityDto; readonly onClose: () => void; readonly onSaved: (item: PreparedEntityDto) => void }) {
  const [name, setName] = useState(current?.name ?? ""); const [notes, setNotes] = useState(current?.notes ?? ""); const [image, setImage] = useState(current?.imagePath ?? null); const [templateId, setTemplateId] = useState(current?.kind === "monster" ? current.templateId : null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [conflict, setConflict] = useState(false);
  const monster = kind === "monster";
  const retainedMissing = current?.kind === "monster" && !templates.some(template => template.id === current.templateId);
  const save = async () => {
    if (!name.trim() || (monster && !current && !templateId)) { setError(monster ? "Elige una plantilla para el monstruo." : "Escribe el nombre del NPC."); return; }
    setBusy(true); setError(""); setConflict(false); const common = { name: name.trim(), notes, imagePath: image };
    try {
      if (current) {
        if (monster && current.kind === "monster") { const changedTemplate = templateId && templateId !== current.templateId; onSaved(await client.updatePreparation(campaignId, arcId, current.id, current.revision, changedTemplate ? { kind: "monster", ...common, templateId, binding: { scope: "catalog", ...systemRef, templateId } } : { kind: "monster", ...common })); }
        else onSaved(await client.updatePreparation(campaignId, arcId, current.id, current.revision, { kind: "npc", ...common }));
      } else if (monster && templateId) onSaved(await client.createPreparation(campaignId, arcId, { kind: "monster", ...common, templateId, binding: { scope: "catalog", ...systemRef, templateId } }));
      else onSaved(await client.createPreparation(campaignId, arcId, { kind: "npc", ...common }));
    } catch (cause) { setConflict(isConflict(cause)); setError(failureMessage(cause)); } finally { setBusy(false); }
  };
  const reload = async () => { if (!current) return; setBusy(true); setError(""); try { const fresh = await client.getPreparation(campaignId, arcId, current.id); setName(fresh.name); setNotes(fresh.notes); setImage(fresh.imagePath); setTemplateId(fresh.kind === "monster" ? fresh.templateId : null); setConflict(false); } catch (cause) { setError(failureMessage(cause)); } finally { setBusy(false); } };
  const chooseImage = async () => { setBusy(true); setError(""); try { const assetId = await client.uploadCover(); if (assetId) setImage(`asset:${assetId}`); } catch (cause) { setError(failureMessage(cause)); } finally { setBusy(false); } };
  return <ServiceDialog title={`${current ? "Editar" : "Agregar"} ${singularFor(kind)}`} onCancel={() => { if (!busy) onClose(); }}><form onSubmit={event => { event.preventDefault(); void save(); }}><label>Nombre<input autoFocus required value={name} maxLength={200} onChange={event => setName(event.target.value)}/></label>{monster && <SearchableSelect label="Plantilla" options={templates} value={templateId} onChange={setTemplateId} disabled={busy} fallbackLabel={retainedMissing ? "Plantilla retenida (no disponible)" : undefined} placeholder="Buscar y elegir plantilla" noResultsText="No hay plantillas coincidentes." description={retainedMissing ? "La plantilla retenida ya no admite usos nuevos; puedes conservar esta ficha sin cambiarla." : undefined}/>}<div className="campaign-cover-picker"><span>Imagen</span><p>{image ? "Imagen seleccionada" : "Sin imagen"}</p><button type="button" disabled={busy} onClick={() => void chooseImage()}>Elegir imagen</button>{image && <button type="button" disabled={busy} onClick={() => setImage(null)}>Quitar imagen</button>}</div><label>Notas<textarea value={notes} rows={5} maxLength={1_000_000} onChange={event => setNotes(event.target.value)}/></label>{error && <p role="alert">{error}</p>}{conflict && <button type="button" disabled={busy} onClick={() => void reload()}>Recargar ficha</button>}<footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy || (monster && !current && !templateId)}>{busy ? "Guardando…" : "Guardar"}</button></footer></form></ServiceDialog>;
}
