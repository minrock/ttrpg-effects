import { useEffect, useRef, useState } from "react";
import type { ArcDto, ArcSceneDto, CampaignPage } from "../shared/contracts/campaigns";
import { CampaignClient } from "../infrastructure/browser/campaign-client";
import type { HttpTransport } from "../infrastructure/browser/http";
import type { CampaignSelection } from "../shared/contracts/campaigns";

export interface CampaignSceneGroup {
  readonly arc: ArcDto;
  readonly scenes: readonly ArcSceneDto[];
}

/** Recorre páginas sin asumir que el servidor siempre avanza el cursor. */
async function readPages<T>(read: (offset: number) => Promise<CampaignPage<T>>, isCurrent: () => boolean): Promise<readonly T[]> {
  const items: T[] = [];
  let offset = 0;
  let total = 0;
  do {
    if (!isCurrent()) throw new Error("Carga de escenas cancelada.");
    const page = await read(offset);
    if (!isCurrent()) throw new Error("Carga de escenas cancelada.");
    total = page.total;
    if (page.offset !== offset || (page.items.length === 0 && offset < total)) {
      throw new Error("No se pudo completar el listado de escenas. Reintenta la carga.");
    }
    items.push(...page.items);
    offset += page.items.length;
  } while (offset < total);
  return items;
}

/** Obtiene sólo metadatos de la campaña activa, preservando asociaciones por arco. */
export async function loadCampaignSceneGroups(client: CampaignClient, campaignId: string, isCurrent: () => boolean = () => true): Promise<readonly CampaignSceneGroup[]> {
  const arcs = await readPages(offset => client.listArcs(campaignId, { limit: 100, offset }), isCurrent);
  const seenArcs = new Set<string>();
  const groups: CampaignSceneGroup[] = [];
  for (const arc of arcs) {
    if (!isCurrent()) throw new Error("Carga de escenas cancelada.");
    if (seenArcs.has(arc.id)) continue;
    seenArcs.add(arc.id);
    const scenes = await readPages(offset => client.listScenes(campaignId, arc.id, { limit: 100, offset }), isCurrent);
    const seenAssociations = new Set<string>();
    groups.push({ arc, scenes: scenes.filter(scene => {
      const key = `${scene.campaignId}:${scene.arcId}:${scene.sceneId}`;
      if (seenAssociations.has(key)) return false;
      seenAssociations.add(key);
      return true;
    }) });
  }
  return groups;
}

type LoadState =
  | { readonly phase: "idle" | "loading" }
  | { readonly phase: "ready"; readonly groups: readonly CampaignSceneGroup[] }
  | { readonly phase: "error"; readonly message: string };

export function CampaignSceneMenu({ http, campaignId, currentSelection, open, disabled = false, onSelect }: {
  http: HttpTransport;
  campaignId: string;
  currentSelection?: CampaignSelection;
  open: boolean;
  disabled?: boolean;
  onSelect: (selection: CampaignSelection) => Promise<boolean>;
}) {
  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const [retry, setRetry] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const generation = useRef(0);
  const currentRow = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    if (!open) {
      setState({ phase: "idle" });
      setSelecting(false);
      return;
    }
    setState({ phase: "loading" });
    const client = new CampaignClient(http);
    let live = true;
    const isCurrent = () => live && generation.current === currentGeneration;
    void loadCampaignSceneGroups(client, campaignId, isCurrent).then(groups => {
      if (generation.current === currentGeneration) setState({ phase: "ready", groups });
    }).catch(cause => {
      if (generation.current === currentGeneration) setState({ phase: "error", message: cause instanceof Error && cause.message ? cause.message : "No se pudieron cargar las escenas." });
    });
    return () => { live = false; if (generation.current === currentGeneration) generation.current++; };
  }, [campaignId, http, open, retry]);

  useEffect(() => {
    const trigger = document.activeElement?.closest(".header-dropdown")?.querySelector("summary");
    if (open && state.phase === "ready" && trigger === document.activeElement) currentRow.current?.focus();
  }, [open, state]);

  async function select(scene: ArcSceneDto) {
    const selection = { campaignId, arcId: scene.arcId, sceneId: scene.sceneId };
    if (currentSelection?.campaignId === selection.campaignId && currentSelection.arcId === selection.arcId && currentSelection.sceneId === selection.sceneId) return;
    if (scene.writeBlock || selecting || disabled) return;
    setSelecting(true);
    try { await onSelect(selection); } finally { setSelecting(false); }
  }

  if (!open) return null;
  if (state.phase === "idle" || state.phase === "loading") return <p className="campaign-scene-menu-status" role="status">Cargando escenas…</p>;
  if (state.phase === "error") return <div className="campaign-scene-menu-status campaign-scene-menu-error" role="alert"><span>{state.message}</span><button type="button" data-dropdown-keep-open="true" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>;
  if (state.phase !== "ready") return null;
  if (state.groups.length === 0) return <p className="campaign-scene-menu-status">Esta campaña no tiene arcos</p>;
  return <div className="campaign-scene-menu-list" aria-label="Escenas de la campaña">
    {state.groups.map(({ arc, scenes }) => <section className="campaign-scene-menu-group" key={arc.id}>
      <h2>{arc.name}</h2>
      {scenes.length === 0 ? <p>Sin escenas</p> : scenes.map(scene => {
        const current = currentSelection?.campaignId === campaignId && currentSelection.arcId === scene.arcId && currentSelection.sceneId === scene.sceneId;
        const blocked = scene.writeBlock ? "Esta escena está compartida con una campaña inactiva." : undefined;
        return <button key={`${scene.arcId}:${scene.sceneId}`} type="button" className="campaign-scene-menu-row" aria-current={current ? "page" : undefined} aria-describedby={blocked ? `scene-block-${scene.arcId}-${scene.sceneId}` : undefined} disabled={!!blocked || selecting || disabled} ref={current ? currentRow : undefined} onClick={() => void select(scene)}>
          <span>{scene.name}</span>{current && <strong>Actual</strong>}{blocked && <small id={`scene-block-${scene.arcId}-${scene.sceneId}`}>{blocked}</small>}
        </button>;
      })}
    </section>)}
  </div>;
}
