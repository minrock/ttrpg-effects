import { ChevronRight, ImageOff, Pencil, Plus, RefreshCw, Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CampaignClient } from "../../infrastructure/browser/campaign-client";
import type { ArcDto, ArcSceneDto, CampaignDto, CampaignSelection } from "../../shared/contracts/campaigns";
import type { SystemRef } from "../../domain/systems/system-catalog";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { ServiceDialog } from "../dialogs";
import { ArcPreparationPanel } from "./ArcPreparationPanel";
import { failureMessage } from "../service-model";
import { SharedSwitch } from "../../renderer/src/components/SharedSwitch";

type Route = { readonly level: "campaigns" } | { readonly level: "arcs"; readonly campaignId: string } | { readonly level: "scenes"; readonly campaignId: string; readonly arcId: string } | { readonly level: "npcs"; readonly campaignId: string; readonly arcId: string } | { readonly level: "monsters"; readonly campaignId: string; readonly arcId: string } | { readonly level: "scene-details"; readonly campaignId: string; readonly arcId: string; readonly sceneId: string };
type SelectableSystem = { readonly name: string; readonly ref: SystemRef; readonly templates: readonly { readonly id: string; readonly name: string }[] };
type Props = {
  readonly client: CampaignClient;
  readonly accountId?: string;
  readonly systems: readonly SelectableSystem[];
  readonly route: Route;
  readonly onNavigate: (route: Route) => void;
  readonly onSelectScene: (selection: CampaignSelection) => void;
  readonly onEnteredArc?: (campaignId: string, arcId: string) => void;
  readonly recentArcId?: string;
  readonly returnSceneId?: string;
  readonly navigationSlot?: HTMLElement | null;
  readonly onNavigation?: () => void;
};
type Form = { readonly kind: "campaign"; readonly campaign?: CampaignDto } | { readonly kind: "arc"; readonly campaign: CampaignDto; readonly arc?: ArcDto };

function assetPath(assetId: string | null): string | undefined { return assetId ? `/api/v1/dm/assets/${assetId}` : undefined; }
function sceneCoverPath(scene: ArcSceneDto): string | undefined {
  if (scene.cover.source === "custom") return assetPath(scene.cover.assetId);
  if (scene.cover.source === "map-0") return scene.map0ImagePath?.startsWith("asset:") ? assetPath(scene.map0ImagePath.slice(6)) : undefined;
  return undefined;
}
function readableSystem(campaign: CampaignDto): string { return `${campaign.systemRef.systemId} · versión ${campaign.systemRef.version}`; }
function focusTitle(): void { queueMicrotask(() => document.querySelector<HTMLElement>(".campaigns-panel h1")?.focus()); }

function Cover({ src, label }: { readonly src?: string; readonly label: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setFailed(false); setAttempt(0); }, [src]);
  if (!src || failed) return <div className="campaign-cover campaign-cover--placeholder" aria-label={failed ? `Portada de ${label} no disponible` : `Sin portada para ${label}`}><ImageOff aria-hidden="true" size={27}/><span>{failed ? "Portada no disponible" : "Sin portada"}</span>{src && <button onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Reintentar portada</button>}</div>;
  return <img key={attempt} className="campaign-cover" src={src} alt="" onError={() => setFailed(true)}/>;
}

function Breadcrumbs({ campaign, arc, route, current, onNavigate }: { readonly campaign?: CampaignDto; readonly arc?: ArcDto; readonly route: Route; readonly current: string; readonly onNavigate: Props["onNavigate"] }) {
  const root = route.level === "campaigns";
  const campaignCurrent = route.level === "arcs";
  const arcCurrent = route.level === "scenes";
  return <nav className="campaign-breadcrumbs" aria-label="Ruta de campañas">{!root && <button type="button" onClick={() => onNavigate({ level: "campaigns" })}>Campañas</button>}{campaign && !campaignCurrent && <><ChevronRight aria-hidden="true" size={15}/><button type="button" onClick={() => onNavigate({ level: "arcs", campaignId: campaign.id })}>{campaign.name}</button></>}{arc && !arcCurrent && <><ChevronRight aria-hidden="true" size={15}/><button type="button" onClick={() => onNavigate({ level: "scenes", campaignId: campaign!.id, arcId: arc.id })}>{arc.name}</button></>}{!root && <ChevronRight aria-hidden="true" size={15}/>}<span aria-current="page">{current}</span></nav>;
}

function CampaignNavigation({ route, campaign, arc, loading, error, onNavigate }: { readonly route: Route; readonly campaign?: CampaignDto; readonly arc?: ArcDto; readonly loading: boolean; readonly error: string; readonly onNavigate: (route: Route) => void }) {
  const loadedContext = !loading && !error;
  const rootCurrent = route.level === "campaigns" || !loadedContext || !campaign;
  return <>
    <button type="button" className="admin-sidebar-home" aria-current={rootCurrent ? "page" : undefined} onClick={() => onNavigate({ level: "campaigns" })}>Campañas</button>
    {loading && <p className="admin-sidebar-status" role="status">Cargando navegación…</p>}
    {loadedContext && campaign ? <><span className="admin-sidebar-name" title={campaign.name}>{campaign.name}</span><button type="button" aria-current={route.level === "arcs" ? "page" : undefined} onClick={() => onNavigate({ level: "arcs", campaignId: campaign.id })}>Arcos</button>
      {arc ? <><span className="admin-sidebar-name" title={arc.name}>{arc.name}</span><button type="button" aria-current={route.level === "scenes" || route.level === "scene-details" ? "page" : undefined} onClick={() => onNavigate({ level: "scenes", campaignId: campaign.id, arcId: arc.id })}>Escenas</button><button type="button" aria-current={route.level === "npcs" ? "page" : undefined} onClick={() => onNavigate({ level: "npcs", campaignId: campaign.id, arcId: arc.id })}>NPCs</button><button type="button" aria-current={route.level === "monsters" ? "page" : undefined} onClick={() => onNavigate({ level: "monsters", campaignId: campaign.id, arcId: arc.id })}>Monstruos</button></> : null}</> : null}
  </>;
}

function PageNav({ offset, total, onPage }: { readonly offset: number; readonly total: number; readonly onPage: (offset: number) => void }) {
  if (total <= 50) return null;
  return <nav className="campaign-page-nav" aria-label="Páginas"><button disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - 50))}>Anterior</button><span>Página {Math.floor(offset / 50) + 1}</span><button disabled={offset + 50 >= total} onClick={() => onPage(offset + 50)}>Siguiente</button></nav>;
}

function SceneOptions({ client, campaign, arc, scene, onClose, onSaved }: { readonly client: CampaignClient; readonly campaign: CampaignDto; readonly arc: ArcDto; readonly scene: ArcSceneDto; readonly onClose: () => void; readonly onSaved: (value: ArcSceneDto) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const choose = async () => { setBusy(true); setError(""); try { const assetId = await client.uploadCover(); if (assetId !== null) onSaved(await client.updateSceneCover(campaign.id, arc.id, scene.sceneId, scene.coverRevision, { customCoverAssetId: assetId })); } catch (cause) { setError(failureMessage(cause)); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); setError(""); try { onSaved(await client.updateSceneCover(campaign.id, arc.id, scene.sceneId, scene.coverRevision, { customCoverAssetId: null })); } catch (cause) { setError(failureMessage(cause)); } finally { setBusy(false); } };
  return <ServiceDialog title={`Portada de ${scene.name}`} onCancel={() => { if (!busy) onClose(); }}><Cover label={scene.name} src={sceneCoverPath(scene)}/><p>La imagen propia tiene prioridad; al quitarla se muestra la imagen del mapa 0 cuando esté disponible.</p>{error && <p role="alert">{error}</p>}<footer><button disabled={busy} onClick={() => void choose()}>Elegir imagen</button>{scene.customCoverAssetId && <button disabled={busy} onClick={() => void remove()}>Quitar imagen propia</button>}<button autoFocus disabled={busy} onClick={onClose}>Cerrar</button></footer></ServiceDialog>;
}

function NewScene({ client, campaign, arc, onClose, onSaved }: { readonly client: CampaignClient; readonly campaign: CampaignDto; readonly arc: ArcDto; readonly onClose: () => void; readonly onSaved: (value: ArcSceneDto) => void }) {
  const [name, setName] = useState("Nueva escena"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const create = async () => { if (!name.trim()) return; setBusy(true); setError(""); try { onSaved(await client.createScene(campaign.id, arc.id, { name: name.trim(), scene: createDefaultScene(), bindings: { monsters: {} } })); onClose(); } catch (cause) { setError(failureMessage(cause)); } finally { setBusy(false); } };
  return <ServiceDialog title={`Crear escena en ${arc.name}`} onCancel={() => { if (!busy) onClose(); }}><form onSubmit={event => { event.preventDefault(); void create(); }}><label>Nombre de escena<input autoFocus value={name} maxLength={200} required onChange={event => setName(event.target.value)}/></label><p>Se crea una escena vacía con Mapa 1, sin imagen ni entidades, y no inicia una mesa.</p>{error && <p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy || !name.trim()}>{busy ? "Creando…" : "Crear escena"}</button></footer></form></ServiceDialog>;
}

function CampaignForm({ form, systems, client, onClose, onSaved, onChangeState }: { readonly form: Form; readonly systems: readonly SelectableSystem[]; readonly client: CampaignClient; readonly onClose: () => void; readonly onSaved: (value: CampaignDto | ArcDto) => void; readonly onChangeState: (campaign: CampaignDto) => void }) {
  const existing = form.kind === "campaign" ? form.campaign : form.arc;
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [coverAssetId, setCoverAssetId] = useState(existing?.coverAssetId ?? null);
  const [system, setSystem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const readOnly = form.kind === "campaign" && form.campaign?.state === "inactive";
  const chooseCover = async () => { setBusy(true); setError(""); try { const uploaded = await client.uploadCover(); if (uploaded !== null) setCoverAssetId(uploaded); } catch (cause) { setError(failureMessage(cause)); } finally { setBusy(false); } };
  const reload = async () => {
    if (!existing) return;
    setBusy(true); setError("");
    try {
      const value = form.kind === "campaign" ? await client.getCampaign(form.campaign!.id) : await client.getArc(form.campaign.id, form.arc!.id);
      setName(value.name); setDescription(value.description); setCoverAssetId(value.coverAssetId); setConflict(false);
    } catch (cause) { setError(failureMessage(cause)); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!name.trim()) { setError("Escribe un nombre."); return; }
    setBusy(true); setError("");
    try {
      if (form.kind === "campaign") {
        let value: CampaignDto;
        if (form.campaign) value = await client.updateCampaign(form.campaign.id, form.campaign.revision, { name: name.trim(), description, coverAssetId });
        else {
          const selected = systems.find(entry => `${entry.ref.systemId}:${entry.ref.version}` === system);
          if (!selected) throw new Error("Selecciona un sistema y versión habilitados.");
          value = await client.createCampaign({ name: name.trim(), description, coverAssetId, systemRef: selected.ref });
        }
        onSaved(value);
      } else {
        const value = form.arc ? await client.updateArc(form.campaign.id, form.arc.id, form.arc.revision, { name: name.trim(), description, coverAssetId }) : await client.createArc(form.campaign.id, { name: name.trim(), description, coverAssetId });
        onSaved(value);
      }
      onClose();
    } catch (cause) { setConflict(typeof cause === "object" && cause !== null && "status" in cause && (cause as { status?: number }).status === 409); setError(failureMessage(cause)); } finally { setBusy(false); }
  };
  const noun = form.kind === "campaign" ? "campaña" : "arco";
  return <ServiceDialog title={`${existing ? "Editar" : "Crear"} ${noun}`} onCancel={() => { if (!busy) onClose(); }}><form onSubmit={event => { event.preventDefault(); void save(); }}>
    {readOnly && <p className="campaign-readonly">Los metadatos y la portada están disponibles solo para consulta. Reactiva la campaña para editarlos.</p>}
    <label>Nombre<input autoFocus disabled={readOnly} maxLength={200} required value={name} onChange={event => setName(event.target.value)}/></label>
    <label>Descripción<textarea disabled={readOnly} maxLength={4_000} rows={4} value={description} onChange={event => setDescription(event.target.value)}/></label>
    {form.kind === "campaign" && !form.campaign && <label>Sistema y versión<select required value={system} onChange={event => setSystem(event.target.value)}><option value="">Selecciona explícitamente</option>{systems.map(entry => <option key={`${entry.ref.systemId}:${entry.ref.version}`} value={`${entry.ref.systemId}:${entry.ref.version}`}>{entry.name} · {entry.ref.systemId} · v{entry.ref.version}</option>)}</select></label>}
    {form.kind === "campaign" && form.campaign && <label className="campaign-switch-row"><span>Campaña activa</span><SharedSwitch checked={form.campaign.state === "active"} disabled={busy} ariaLabel="Campaña activa" onCheckedChange={() => { onClose(); onChangeState(form.campaign!); }}/></label>}
    <div className="campaign-cover-picker"><span>Portada</span><Cover label={name || noun} src={assetPath(coverAssetId)}/>{!readOnly && <div><button type="button" disabled={busy} onClick={() => void chooseCover()}>Elegir imagen</button>{coverAssetId && <button type="button" disabled={busy} onClick={() => setCoverAssetId(null)}>Quitar portada</button>}</div>}</div>
    {error && <p role="alert">{error}</p>}{conflict && <button type="button" disabled={busy} onClick={() => void reload()}>Recargar datos</button>}<footer><button type="button" autoFocus onClick={onClose} disabled={busy}>Cancelar</button><button disabled={busy || readOnly || (!existing && form.kind === "campaign" && !systems.length)}>{busy ? "Guardando…" : "Guardar"}</button></footer>
  </form></ServiceDialog>;
}

export function CampaignPanel({ client, accountId, systems, route, onNavigate, onSelectScene: selectScene, recentArcId, onEnteredArc, returnSceneId, navigationSlot, onNavigation }: Props) {
  const [campaigns, setCampaigns] = useState<readonly CampaignDto[]>([]);
  const [arcs, setArcs] = useState<readonly ArcDto[]>([]);
  const [scenes, setScenes] = useState<readonly ArcSceneDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("active");
  const [form, setForm] = useState<Form | null>(null);
  const [stateTarget, setStateTarget] = useState<CampaignDto | null>(null);
  const [stateBusy, setStateBusy] = useState(false);
  const [sceneOptions, setSceneOptions] = useState<ArcSceneDto | null>(null);
  const [creatingScene, setCreatingScene] = useState(false);
  const [sceneMaps, setSceneMaps] = useState<readonly { readonly id: string; readonly name: string }[] | null>(null);
  const [focusSceneId, setFocusSceneId] = useState<string | null>(null);
  const request = useRef(0);
  const enteredArc = useRef("");
  const sceneCards = useRef(new Map<string, HTMLElement>());
  const restoredScene = useRef("");
  const campaign = useMemo(() => route.level === "campaigns" ? undefined : campaigns.find(entry => entry.id === route.campaignId), [campaigns, route]);
  const visibleArcs = useMemo(() => campaign ? arcs.filter(entry => entry.campaignId === campaign.id) : [], [arcs, campaign]);
  const arc = useMemo(() => route.level === "scenes" || route.level === "npcs" || route.level === "monsters" || route.level === "scene-details" ? visibleArcs.find(entry => entry.id === route.arcId) : undefined, [route, visibleArcs]);
  const visibleScenes = useMemo(() => campaign && arc ? scenes.filter(entry => entry.campaignId === campaign.id && entry.arcId === arc.id) : [], [arc, campaign, scenes]);
  const scene = useMemo(() => route.level === "scene-details" ? visibleScenes.find(entry => entry.sceneId === route.sceneId) : undefined, [route, visibleScenes]);
  const inactive = campaign?.state === "inactive";
  const load = useCallback(async () => {
    const current = ++request.current; setLoading(true); setError("");
    try {
      const all = await client.listCampaigns({ state: route.level === "campaigns" && filter !== "all" ? filter : undefined, limit: 50, offset });
      if (request.current !== current) return;
      setCampaigns(all.items);
      if (route.level === "campaigns") { setTotal(all.total); return; }
      const selected = all.items.find(entry => entry.id === route.campaignId) ?? await client.getCampaign(route.campaignId);
      if (request.current !== current) return;
      setCampaigns(previous => previous.some(entry => entry.id === selected.id) ? previous.map(entry => entry.id === selected.id ? selected : entry) : [...previous, selected]);
      const arcsPage = await client.listArcs(selected.id, { limit: 50, offset });
      if (request.current !== current) return;
      setArcs(arcsPage.items);
      if (route.level === "arcs") { setTotal(arcsPage.total); return; }
      const selectedArc = arcsPage.items.find(entry => entry.id === route.arcId) ?? await client.getArc(selected.id, route.arcId);
      if (request.current !== current) return;
      setArcs(previous => previous.some(entry => entry.id === selectedArc.id) ? previous.map(entry => entry.id === selectedArc.id ? selectedArc : entry) : [...previous, selectedArc]);
      const scenePage = await client.listScenes(selected.id, selectedArc.id, { limit: 50, offset });
      if (request.current !== current) return;
      setScenes(scenePage.items); setTotal(scenePage.total);
      if (route.level === "scene-details") {
        const detail = scenePage.items.find(entry => entry.sceneId === route.sceneId);
        if (!detail) throw new Error("La escena ya no pertenece a este arco.");
        const maps = await client.getSceneMaps(detail.sceneId);
        if (request.current !== current) return;
        setSceneMaps(maps);
      } else setSceneMaps(null);
      if (route.level === "scenes" || route.level === "scene-details") {
        const enteredKey = route.level === "scene-details" ? `${selected.id}:${selectedArc.id}:${route.sceneId}` : `${selected.id}:${selectedArc.id}:list`;
        if (enteredArc.current !== enteredKey) { enteredArc.current = enteredKey; onEnteredArc?.(selected.id, selectedArc.id); }
      }
    } catch (cause) { if (request.current === current) setError(failureMessage(cause)); }
    finally { if (request.current === current) setLoading(false); }
  }, [client, filter, offset, onEnteredArc, retry, route]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  useEffect(focusTitle, [route.level, route.level === "campaigns" ? filter : route]);
  useEffect(() => { setOffset(0); enteredArc.current = ""; setSceneMaps(null); }, [filter, route]);
  useEffect(() => {
    if (!returnSceneId || route.level !== "scenes" || !visibleScenes.some(item => item.sceneId === returnSceneId)) return;
    const key = `${route.campaignId}:${route.arcId}:${returnSceneId}`;
    if (restoredScene.current !== key) { restoredScene.current = key; setFocusSceneId(returnSceneId); }
  }, [returnSceneId, route, visibleScenes]);
  useEffect(() => {
    if (!focusSceneId) return;
    const focus = () => {
      const card = sceneCards.current.get(focusSceneId);
      if (card) card.focus();
      else document.querySelector<HTMLElement>(".campaigns-panel h1")?.focus();
      setFocusSceneId(null);
    };
    const frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(focus) : (queueMicrotask(focus), null);
    return () => { if (frame !== null) cancelAnimationFrame(frame); };
  }, [focusSceneId, scenes]);
  const updateCampaign = (value: CampaignDto) => setCampaigns(previous => previous.some(entry => entry.id === value.id) ? previous.map(entry => entry.id === value.id ? value : entry) : [...previous, value]);
  const updateArc = (value: ArcDto) => setArcs(previous => previous.some(entry => entry.id === value.id) ? previous.map(entry => entry.id === value.id ? value : entry) : [...previous, value]);
  const setState = async () => {
    if (!stateTarget) return; setStateBusy(true); setError("");
    try { updateCampaign(await client.setCampaignState(stateTarget.id, stateTarget.revision, stateTarget.state === "active" ? "inactive" : "active")); setStateTarget(null); }
    catch (cause) { setError(failureMessage(cause)); }
    finally { setStateBusy(false); }
  };
  const retryLoad = () => { setRetry(value => value + 1); };
  const showScenes = (entry: ArcDto) => onNavigate({ level: "scenes", campaignId: entry.campaignId, arcId: entry.id });
  const onSelectScene = (selection: CampaignSelection) => selectScene(selection);
  const nav = (next: Route) => { onNavigate(next); onNavigation?.(); };
  const navigation = navigationSlot ? createPortal(<CampaignNavigation route={route} campaign={campaign} arc={arc} loading={loading} error={error} onNavigate={nav}/>, navigationSlot) : null;
  const breadcrumbCurrent = route.level === "campaigns" ? "Campañas" : route.level === "arcs" ? campaign?.name ?? "Campaña" : route.level === "scenes" ? arc?.name ?? "Arco" : route.level === "npcs" ? "NPCs" : route.level === "monsters" ? "Monstruos" : scene?.name ?? "Detalle de escena";
  return <>{navigation}<section className="campaigns-panel"><Breadcrumbs campaign={campaign} arc={arc} route={route} current={breadcrumbCurrent} onNavigate={nav}/>{error && <p role="alert" className="campaign-error">{error} <button onClick={retryLoad}><RefreshCw size={15} aria-hidden="true"/>Reintentar</button></p>}
    {route.level === "campaigns" && <><div className="campaign-page-heading"><div><h1 tabIndex={-1}>Campañas</h1><p>Organiza los arcos y escenas antes de abrir la mesa.</p></div><button disabled={!systems.length} onClick={() => setForm({ kind: "campaign" })}><Plus size={16} aria-hidden="true"/>Nueva campaña</button></div>{!systems.length && <p>No hay sistemas habilitados para nuevas campañas. Puedes consultar las existentes.</p>}<div className="campaign-filter" aria-label="Filtro de campañas">{(["active", "inactive", "all"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => { setOffset(0); setFilter(value); }}>{({ active: "Activas", inactive: "Inactivas", all: "Todas" })[value]}</button>)}</div>{loading ? <p role="status">Cargando campañas…</p> : campaigns.length === 0 ? <section className="campaign-empty"><p>No hay campañas {filter === "active" ? "activas" : "en esta vista"}.</p>{filter !== "inactive" && systems.length > 0 && <button onClick={() => setForm({ kind: "campaign" })}>Crear campaña</button>}</section> : <ul className="campaign-cards">{campaigns.map(entry => <li key={entry.id}><article className="campaign-card"><Cover label={entry.name} src={assetPath(entry.coverAssetId)}/><div className="campaign-card-body"><p className="campaign-badge">{entry.state === "active" ? "Activa" : "Inactiva"}</p><h2>{entry.name}</h2><p>{readableSystem(entry)}</p>{entry.description && <p>{entry.description}</p>}<div className="campaign-card-actions"><button onClick={() => onNavigate({ level: "arcs", campaignId: entry.id })}>Ver arcos de {entry.name}</button>{entry.state === "active" ? <button className="campaign-option" aria-label={`Editar ${entry.name}`} title="Editar campaña" onClick={() => setForm({ kind: "campaign", campaign: entry })}><Pencil size={16} aria-hidden="true"/></button> : <button onClick={() => setStateTarget(entry)}>Reactivar</button>}</div></div></article></li>)}</ul>}<PageNav offset={offset} total={total} onPage={setOffset}/></>}
    {route.level === "arcs" && campaign && <><div className="campaign-page-heading"><div><h1 tabIndex={-1}>{campaign.name}</h1><p>{readableSystem(campaign)} · {inactive ? "Solo consulta" : "Campaña activa"}</p></div><div className="campaign-heading-actions">{!inactive && <button onClick={() => setForm({ kind: "arc", campaign })}><Plus size={16} aria-hidden="true"/>Crear arco</button>}<button className="campaign-option" aria-label={`Ajustes de ${campaign.name}`} title="Ajustes de campaña" onClick={() => setForm({ kind: "campaign", campaign })}><Settings2 size={16} aria-hidden="true"/></button></div></div>{inactive && <p className="campaign-readonly">Esta campaña es solo de consulta. Reactívala para editar arcos, escenas o portadas.</p>}{loading ? <p role="status">Cargando arcos…</p> : visibleArcs.length === 0 ? <section className="campaign-empty"><p>No hay arcos en esta campaña.</p>{inactive ? <button onClick={() => setStateTarget(campaign)}>Reactivar campaña</button> : <button onClick={() => setForm({ kind: "arc", campaign })}>Crear arco</button>}</section> : <ul className="campaign-cards">{visibleArcs.map(entry => <li key={entry.id}><article className="campaign-card"><Cover label={entry.name} src={assetPath(entry.coverAssetId)}/><div className="campaign-card-body">{recentArcId === entry.id && <p className="campaign-badge">Visitado recientemente</p>}<h2>{entry.name}</h2><p>{entry.sceneCount} {entry.sceneCount === 1 ? "escena" : "escenas"}</p>{entry.description && <p>{entry.description}</p>}<div className="campaign-card-actions"><button onClick={() => showScenes(entry)}>Ver escenas de {entry.name}</button>{!inactive && <button className="campaign-option" aria-label={`Editar ${entry.name}`} title="Editar arco" onClick={() => setForm({ kind: "arc", campaign, arc: entry })}><Pencil size={16} aria-hidden="true"/></button>}</div></div></article></li>)}</ul>}</>}
    {(route.level === "npcs" || route.level === "monsters") && campaign && arc && <ArcPreparationPanel key={`${accountId ?? "account"}:${campaign.id}:${arc.id}:${route.level}`} client={client} accountId={accountId} campaign={campaign} arcId={arc.id} kind={route.level === "npcs" ? "npc" : "monster"} templates={systems.find(system => system.ref.systemId === campaign.systemRef.systemId && system.ref.version === campaign.systemRef.version)?.templates ?? []} onBack={() => nav({ level: "scenes", campaignId: campaign.id, arcId: arc.id })}/>}
    {(route.level === "scenes" || route.level === "scene-details") && campaign && arc && <><div className="campaign-page-heading"><div><h1 tabIndex={-1}>{arc.name}</h1><p>{campaign.name} · {inactive ? "Solo consulta" : "Escoge una escena para continuar"}</p></div>{!inactive && <div className="campaign-heading-actions"><button onClick={() => setCreatingScene(true)}><Plus size={16} aria-hidden="true"/>Crear escena</button><button className="campaign-option" aria-label={`Editar ${arc.name}`} title="Editar arco" onClick={() => setForm({ kind: "arc", campaign, arc })}><Pencil size={16} aria-hidden="true"/></button></div>}</div>{inactive && <p className="campaign-readonly">La campaña está inactiva: puedes consultar las escenas, pero no abrir una mesa ni editar contenido.</p>}{loading ? <p role="status">Cargando escenas…</p> : route.level === "scene-details" && scene ? <section className="campaign-scene-details"><Cover label={scene.name} src={sceneCoverPath(scene)}/><div><h2>{scene.name}</h2><p>{scene.mapCount} {scene.mapCount === 1 ? "mapa" : "mapas"}</p>{sceneMaps === null ? <p role="status">Cargando mapas…</p> : <><h3>Mapas</h3>{sceneMaps.length === 0 ? <p>La escena no contiene mapas.</p> : <ol className="campaign-map-list">{sceneMaps.map(map => <li key={map.id}>{map.name}</li>)}</ol>}</>}<p>Reactiva la campaña para editar o jugar.</p><button onClick={() => onNavigate({ level: "scenes", campaignId: campaign.id, arcId: arc.id })}>Volver a escenas</button></div></section> : visibleScenes.length === 0 ? <section className="campaign-empty"><p>No hay escenas en este arco.</p>{!inactive && <button onClick={() => setCreatingScene(true)}>Crear escena</button>}</section> : <ul className="campaign-cards">{visibleScenes.map(entry => <li key={entry.sceneId}><article ref={node => { if (node) sceneCards.current.set(entry.sceneId, node); else sceneCards.current.delete(entry.sceneId); }} tabIndex={-1} className="campaign-card"><Cover label={entry.name} src={sceneCoverPath(entry)}/><div className="campaign-card-body"><h2>{entry.name}</h2><p>{entry.mapCount} {entry.mapCount === 1 ? "mapa" : "mapas"}</p>{entry.cover.source !== "placeholder" && entry.cover.availability === "missing" && <p className="campaign-cover-warning">La portada no está disponible. La referencia se conserva para reintentar.</p>}<div className="campaign-card-actions">{inactive ? <button onClick={() => onNavigate({ level: "scene-details", campaignId: campaign.id, arcId: arc.id, sceneId: entry.sceneId })}>Ver detalles de {entry.name}</button> : <button onClick={() => onSelectScene({ campaignId: campaign.id, arcId: arc.id, sceneId: entry.sceneId })}>Abrir editor de {entry.name}</button>}{!inactive && <button className="campaign-option" aria-label={`Opciones de ${entry.name}`} title="Opciones de escena" onClick={() => setSceneOptions(entry)}><Settings2 size={16} aria-hidden="true"/></button>}</div></div></article></li>)}</ul>}</>}
  {route.level !== "campaigns" && !loading && <PageNav offset={offset} total={total} onPage={setOffset}/>}</section>{form && <CampaignForm form={form} systems={systems} client={client} onClose={() => setForm(null)} onChangeState={setStateTarget} onSaved={value => { if ("state" in value) updateCampaign(value); else updateArc(value); void load(); }}/>} {sceneOptions && campaign && arc && <SceneOptions client={client} campaign={campaign} arc={arc} scene={sceneOptions} onClose={() => setSceneOptions(null)} onSaved={value => { setScenes(previous => previous.map(entry => entry.sceneId === value.sceneId ? value : entry)); setSceneOptions(null); }}/>} {creatingScene && campaign && arc && <NewScene client={client} campaign={campaign} arc={arc} onClose={() => setCreatingScene(false)} onSaved={value => { setScenes(previous => [...previous, value]); setTotal(current => current + 1); setFocusSceneId(value.sceneId); setCreatingScene(false); }}/>} {stateTarget && <ServiceDialog title={stateTarget.state === "active" ? "Desactivar campaña" : "Reactivar campaña"} onCancel={() => { if (!stateBusy) setStateTarget(null); }}><p>{stateTarget.state === "active" ? `La campaña «${stateTarget.name}» y sus hijos quedarán solo para consulta. Cierra la mesa antes de desactivar.` : `«${stateTarget.name}» volverá a permitir preparación y juego.`}</p>{error && <p role="alert">{error}</p>}<footer><button autoFocus disabled={stateBusy} onClick={() => setStateTarget(null)}>Cancelar</button><button disabled={stateBusy} onClick={() => void setState()}>{stateBusy ? "Guardando…" : stateTarget.state === "active" ? "Desactivar" : "Reactivar"}</button></footer></ServiceDialog>}</>;
}

export type { Route as CampaignRoute };
