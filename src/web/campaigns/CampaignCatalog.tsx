import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CampaignClient } from "../../infrastructure/browser/campaign-client";
import { IndexedDbCampaignRecents } from "../../infrastructure/browser/campaign-recents";
import { isRecentArc } from "../../domain/campaigns/recent-arc";
import type { HttpTransport } from "../../infrastructure/browser/http";
import type { CampaignSelection } from "../../shared/contracts/campaigns";
import { selectableReply } from "../service-model";
import { GameCatalog } from "../GameCatalog";
import { CampaignPanel, type CampaignRoute } from "./CampaignPanel";

export function CampaignCatalog({ http, accountId, onSelectScene, onLegacyOpen, returnSelection, navigationSlot, onNavigation }: { readonly http: HttpTransport; readonly accountId: string; readonly onSelectScene: (value: CampaignSelection) => void; readonly onLegacyOpen: (gameId: string) => void; readonly returnSelection?: CampaignSelection; readonly navigationSlot?: HTMLElement | null; readonly onNavigation?: () => void }) {
  const client = useMemo(() => new CampaignClient(http), [http]);
  const recents = useMemo(() => new IndexedDbCampaignRecents(), []);
  const [supported, setSupported] = useState<"checking" | "yes" | "no">("checking");
  const [systems, setSystems] = useState<readonly { readonly name: string; readonly ref: { readonly systemId: string; readonly version: number }; readonly templates: readonly { readonly id: string; readonly name: string }[] }[]>([]);
  const [route, setRoute] = useState<CampaignRoute>({ level: "campaigns" });
  const [recentArcId, setRecentArcId] = useState<string | undefined>();
  const recordController = useRef<AbortController | null>(null);
  const recentGeneration = useRef(0);
  useEffect(() => {
    let live = true;
    void client.capabilities().then(() => { if (live) setSupported("yes"); }).catch(error => { if (live) setSupported(error instanceof Error && "status" in error && (error as { status?: number }).status === 404 ? "no" : "yes"); });
    void http.request("/dm/systems/selectable", selectableReply).then(reply => { if (live) setSystems(reply.systems); }).catch(() => { if (live) setSystems([]); });
    return () => { live = false; recordController.current?.abort(); client.clear(); };
  }, [client, http]);
  useEffect(() => { recentGeneration.current++; recordController.current?.abort(); recordController.current = null; setRecentArcId(undefined); setRoute({ level: "campaigns" }); }, [accountId]);
  useEffect(() => { if (returnSelection) setRoute({ level: "scenes", campaignId: returnSelection.campaignId, arcId: returnSelection.arcId }); }, [returnSelection?.campaignId, returnSelection?.arcId, returnSelection?.sceneId]);
  useEffect(() => {
    const controller = new AbortController();
    const generation = recentGeneration.current;
    if (route.level === "arcs" || route.level === "scenes" || route.level === "scene-details") {
      void recents.get({ origin: location.origin, accountId, campaignId: route.campaignId }, { signal: controller.signal }).then(visit => {
        if (!controller.signal.aborted && generation === recentGeneration.current) setRecentArcId(visit && isRecentArc(visit, visit.arcId, Date.now()) ? visit.arcId : undefined);
      });
    } else setRecentArcId(undefined);
    return () => controller.abort();
  }, [accountId, recents, route]);
  const navigate = useCallback((next: CampaignRoute) => { recordController.current?.abort(); setRoute(next); }, []);
  const enteredArc = useCallback((campaignId: string, arcId: string) => {
    recentGeneration.current++; recordController.current?.abort(); const controller = new AbortController(); recordController.current = controller;
    setRecentArcId(undefined);
    void recents.record({ origin: location.origin, accountId, campaignId }, { arcId, visitedAt: new Date().toISOString() }, { signal: controller.signal }).then(saved => { if (!controller.signal.aborted && saved) setRecentArcId(arcId); });
  }, [accountId, recents]);
  const rootNavigation = navigationSlot ? createPortal(<button type="button" className="admin-sidebar-home" aria-current="page" onClick={() => onNavigation?.()}>Partidas</button>, navigationSlot) : null;
  if (supported === "checking") return <>{rootNavigation}<p role="status">Cargando campañas…</p></>;
  if (supported === "no") return <>{rootNavigation}<GameCatalog http={http} onOpen={onLegacyOpen}/></>;
  return <CampaignPanel client={client} accountId={accountId} systems={systems} route={route} onNavigate={navigate} onSelectScene={onSelectScene} recentArcId={recentArcId} onEnteredArc={enteredArc} returnSceneId={returnSelection?.sceneId} navigationSlot={navigationSlot} onNavigation={onNavigation}/>;
}
