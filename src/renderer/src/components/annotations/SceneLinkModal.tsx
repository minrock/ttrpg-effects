import { rememberDialogFocus, restoreDialogFocus } from "../../client/dialog-focus";
import { useEffect, useRef, useState, type JSX } from "react";
import { ExternalLink, Link2, MapPinned, Save, Unlink, X } from "lucide-react";
import type { InternalSceneLinkCandidateMap } from "../../../../domain/annotations/internal-scene-links";
import type {
  SceneLinkCandidateFile,
  MapSceneLinkMarker,
  SceneLinkValidationStatus
} from "../../../../domain/annotations/scene-navigation-links";

interface SceneLinkModalProps {
  readonly marker: MapSceneLinkMarker;
  readonly status: SceneLinkValidationStatus;
  readonly currentScenePath: string | null;
  readonly candidateMaps: readonly InternalSceneLinkCandidateMap[];
  readonly remote?: { select: () => Promise<(SceneLinkCandidateFile & { name: string }) | null>; connect: (scenePath: string, markerId: string) => Promise<boolean> };
  readonly onRename: (name: string) => Promise<boolean>;
  readonly onConnect: (targetMapId: string, targetMarkerId: string) => Promise<boolean>;
  readonly onDisconnect: () => Promise<boolean>;
  readonly onNavigate: () => Promise<void>;
  readonly onClose: () => void;
}

export function SceneLinkModal({
  marker,
  status,
  currentScenePath,
  candidateMaps,
  remote,
  onRename,
  onConnect,
  onDisconnect,
  onNavigate,
  onClose
}: SceneLinkModalProps): JSX.Element {
  const panel=useRef<HTMLElement>(null);
  const [remoteScene,setRemoteScene]=useState<(SceneLinkCandidateFile & {name:string})|null>(null);
  const [remoteMarker,setRemoteMarker]=useState("");
  useEffect(()=>{const trigger=document.activeElement;panel.current?.querySelector<HTMLInputElement>("input")?.focus();return()=>restoreDialogFocus(trigger);},[]);
  const [name, setName] = useState(marker.name);
  const [selectedMapId, setSelectedMapId] = useState(candidateMaps[0]?.id ?? "");
  const [selectedMarkerId, setSelectedMarkerId] = useState(candidateMaps[0]?.markers.find((item) => item.available)?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selectedMap = candidateMaps.find((map) => map.id === selectedMapId) ?? null;
  const availableMarkers = selectedMap?.markers.filter((item) => item.available) ?? [];

  const selectRemote = async (): Promise<void> => {
    if (!remote) return;
    setBusy(true);setError(null);
    try {const selected=await remote.select();if(selected){setRemoteScene(selected);setRemoteMarker(selected.markers.find(item=>item.available)?.id??"");}}
    catch(error){setError(error instanceof Error?error.message:"No se pudo cargar el destino. Vuelve a elegir la escena.");}
    finally{setBusy(false);}
  };
  const connectRemote = async (): Promise<void> => {
    if(!remote||!remoteScene||!remoteMarker)return;
    setBusy(true);setError(null);
    try {if(await remote.connect(remoteScene.filePath,remoteMarker))onClose();else setError("No se pudo guardar la conexión. Conservamos el trabajo; reintenta o elige otro destino.");}
    catch(error){setError(error instanceof Error?error.message:"No se pudo conectar. Reintenta.");}
    finally{setBusy(false);}
  };
  const connect = async (): Promise<void> => {
    if (selectedMapId === "" || selectedMarkerId === "") return;
    setBusy(true);
    setError(null);
    try {
      if (await onConnect(selectedMapId, selectedMarkerId)) onClose();
      else setError("No se pudo guardar la conexión. Conservamos el enlace anterior; vuelve a intentarlo.");
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  };

  const rename = async (): Promise<void> => {
    const trimmedName = name.trim();
    if (trimmedName === "" || trimmedName === marker.name) return;
    setBusy(true);
    setError(null);
    try {
      if (!await onRename(trimmedName)) setError("No fue posible guardar el nuevo nombre del punto.");
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "No fue posible guardar el nuevo nombre del punto.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      if (await onDisconnect()) onClose();
      else setError("No se pudo desligar. Conservamos la conexión; vuelve a intentarlo antes de cambiar el destino.");
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "No se pudo desligar. Conservamos la conexión.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop scene-link-backdrop" onClick={()=>{if(!busy)onClose();}}>
      <section ref={panel} onKeyDown={event=>{
        event.stopPropagation();
        if(event.key==="Escape"){event.preventDefault();if(!busy)onClose();}
        if(event.key==="Tab"){const controls=[...panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
      }} className="scene-link-modal" role="dialog" aria-modal="true" aria-labelledby="scene-link-title" onClick={(event) => event.stopPropagation()}>
        <header className="scene-link-modal__header">
          <div className="scene-link-modal__identity">
            <span className="scene-link-modal__icon"><MapPinned aria-hidden="true" /></span>
            <div>
              <small>Habitacion enlazada</small>
              <h2 id="scene-link-title">{marker.name}</h2>
            </div>
          </div>
          <button type="button" className="scene-link-modal__close" disabled={busy} onClick={onClose} aria-label="Cerrar">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="scene-link-modal__body">
          <section className="scene-link-panel">
            <div className="scene-link-panel__heading">
              <div>
                <small>Identidad</small>
                <h3>Nombre del punto</h3>
              </div>
            </div>
            <div className="scene-link-name-row">
              <input aria-label="Nombre del punto" value={name} disabled={busy} maxLength={120} onChange={(event) => setName(event.currentTarget.value)} />
              <button
                type="button"
                title="Guardar nombre"
                onClick={() => void rename()}
                disabled={busy || name.trim() === "" || name.trim() === marker.name}
              >
                <Save aria-hidden="true" />
                Guardar
              </button>
            </div>

            <div className={`scene-link-status is-${status.state}`}>
              <span className="scene-link-status__dot" aria-hidden="true" />
              <div>
                <strong>{statusLabel(status)}</strong>
                {status.state === "broken" ? <span>{status.message}</span> : null}
                {marker.connection?.peer.mapId !== undefined ? <span>Mapa interno conectado</span> : null}
                {marker.connection !== null && marker.connection.peer.mapId === undefined ? <span>{marker.connection.peer.scenePath}</span> : null}
              </div>
            </div>
          </section>

          <section className="scene-link-panel">
            <div className="scene-link-panel__heading">
              <div>
                <small>Destino</small>
                <h3>Mapa y punto de entrada</h3>
              </div>
              <Link2 aria-hidden="true" />
            </div>

            {currentScenePath === null ? (
              <p className="sidebar-hint">La escena se guardara antes de configurar la conexion.</p>
            ) : null}

            {candidateMaps.length === 0 ? (
              <p className="sidebar-hint">Para enlazar dentro de esta escena, agrega otro mapa.</p>
            ) : (
              <div className="scene-link-candidates">
                <label>
                  Mapa destino
                  <select
                    value={selectedMapId}
                    onChange={(event) => {
                      const nextMapId = event.currentTarget.value;
                      const nextMap = candidateMaps.find((map) => map.id === nextMapId);
                      setSelectedMapId(nextMapId);
                      setSelectedMarkerId(nextMap?.markers.find((item) => item.available)?.id ?? "");
                    }}
                  >
                    {candidateMaps.map((map) => (
                      <option key={map.id} value={map.id}>{map.name}</option>
                    ))}
                  </select>
                </label>
                {selectedMap === null || selectedMap.markers.length === 0 ? <p>No hay puntos de conexion en este mapa.</p> : (
                <label>
                  Punto de entrada
                  <select value={selectedMarkerId} onChange={(event) => setSelectedMarkerId(event.currentTarget.value)}>
                    <option value="">Selecciona un punto</option>
                    {selectedMap.markers.map((item) => (
                      <option key={item.id} value={item.id} disabled={!item.available}>
                        {item.name}{item.available ? "" : " (ocupado)"}
                      </option>
                    ))}
                  </select>
                </label>
                )}
                <button type="button" className="is-primary" onClick={() => void connect()} disabled={busy || selectedMarkerId === ""}>
                  <Link2 aria-hidden="true" />
                  Conectar habitaciones
                </button>
                {selectedMap !== null && availableMarkers.length === 0 ? <p>No hay puntos libres en este mapa.</p> : null}
              </div>
            )}
          </section>
          {remote&&<section className="scene-link-panel scene-link-remote">
            <h3>Otra escena guardada</h3>
            <p>Se guardarán los cambios de esta escena antes de conectar. Puedes reparar un destino ausente eligiendo uno del servicio.</p>
            <button type="button" disabled={busy} onClick={event=>{rememberDialogFocus(event.currentTarget);void selectRemote();}}>Elegir escena del servicio</button>
            {busy&&<p role="status">Preparando conexión…</p>}
            {remoteScene&&<div className="scene-link-candidates">
              <p className="service-selected-scene">{remoteScene.name}</p>
              <label>Marcador de la escena<select aria-label="Marcador de la escena" disabled={busy} value={remoteMarker} onChange={event=>setRemoteMarker(event.target.value)}>
                <option value="">Selecciona un marcador</option>
                {remoteScene.markers.map(item=><option key={item.id} value={item.id} disabled={!item.available}>{item.name}{item.available?"":" (ocupado)"}</option>)}
              </select></label>
              {!remoteScene.markers.some(item=>item.available)&&<p>No hay marcadores libres. Elige otra escena o libera un marcador en ella.</p>}
              <button type="button" disabled={busy||!remoteMarker} onClick={()=>void connectRemote()}>Conectar con esta escena</button>
            </div>}
          </section>}
        </div>

        {error !== null ? <p role="alert" className="form-error scene-link-modal__error">{error}</p> : null}

        <footer className="scene-link-modal__footer">
          <button type="button" disabled={busy} onClick={onClose}>Cancelar</button>
          <div>
            {marker.connection !== null ? (
              <>
                <button type="button" onClick={() => void onNavigate()} disabled={busy}>
                  <ExternalLink aria-hidden="true" />
                  Ir al mapa
                </button>
                <button
                  type="button"
                  className="is-danger"
                  title="Liberar los dos puntos de esta conexion"
                  onClick={() => void disconnect()}
                  disabled={busy}
                >
                  <Unlink aria-hidden="true" />
                  Desligar
                </button>
              </>
            ) : null}
          </div>
        </footer>
      </section>
    </div>
  );
}

function statusLabel(status: SceneLinkValidationStatus): string {
  switch (status.state) {
    case "unlinked": return "Sin enlazar";
    case "validating": return "Validando conexion";
    case "valid": return "Conexion valida";
    case "broken": return "Conexion rota";
  }
}
