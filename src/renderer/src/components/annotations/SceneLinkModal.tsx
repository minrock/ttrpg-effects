import { useState, type JSX } from "react";
import { ExternalLink, Link2, MapPinned, Save, Unlink, X } from "lucide-react";
import type {
  MapSceneLinkMarker,
  SceneLinkCandidateFile,
  SceneLinkValidationStatus
} from "../../../../domain/annotations/scene-navigation-links";

interface SceneLinkModalProps {
  readonly marker: MapSceneLinkMarker;
  readonly status: SceneLinkValidationStatus;
  readonly currentScenePath: string | null;
  readonly onRename: (name: string) => Promise<boolean>;
  readonly onConnect: (targetScenePath: string, targetMarkerId: string) => Promise<boolean>;
  readonly onDisconnect: () => Promise<boolean>;
  readonly onNavigate: () => Promise<void>;
  readonly onClose: () => void;
}

export function SceneLinkModal({
  marker,
  status,
  currentScenePath,
  onRename,
  onConnect,
  onDisconnect,
  onNavigate,
  onClose
}: SceneLinkModalProps): JSX.Element {
  const [name, setName] = useState(marker.name);
  const [candidate, setCandidate] = useState<SceneLinkCandidateFile | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chooseTargetFile = async (): Promise<void> => {
    if (window.ttrpg === undefined) return;
    setBusy(true);
    setError(null);
    try {
      const selected = await window.ttrpg.selectSceneLinkTargetFile();
      if (!selected.ok) {
        setError(selected.error);
        return;
      }
      if (selected.filePath === null) return;
      if (selected.filePath === currentScenePath) {
        setError("Selecciona una escena diferente a la actual.");
        return;
      }
      const listed = await window.ttrpg.listSceneLinkCandidates(selected.filePath);
      if (!listed.ok) {
        setError(listed.error);
        return;
      }
      setCandidate(listed.candidate);
      setSelectedMarkerId(listed.candidate.markers.find((item) => item.available)?.id ?? "");
    } finally {
      setBusy(false);
    }
  };

  const connect = async (): Promise<void> => {
    if (candidate === null || selectedMarkerId === "") return;
    setBusy(true);
    setError(null);
    try {
      if (await onConnect(candidate.filePath, selectedMarkerId)) onClose();
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop scene-link-backdrop" onClick={onClose}>
      <section className="scene-link-modal" role="dialog" aria-modal="true" aria-labelledby="scene-link-title" onClick={(event) => event.stopPropagation()}>
        <header className="scene-link-modal__header">
          <div className="scene-link-modal__identity">
            <span className="scene-link-modal__icon"><MapPinned aria-hidden="true" /></span>
            <div>
              <small>Habitacion enlazada</small>
              <h2 id="scene-link-title">{marker.name}</h2>
            </div>
          </div>
          <button type="button" className="scene-link-modal__close" onClick={onClose} aria-label="Cerrar">
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
              <input aria-label="Nombre del punto" value={name} maxLength={120} onChange={(event) => setName(event.currentTarget.value)} />
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
                {marker.connection !== null ? <span>{marker.connection.peer.scenePath}</span> : null}
              </div>
            </div>
          </section>

          <section className="scene-link-panel">
            <div className="scene-link-panel__heading">
              <div>
                <small>Destino</small>
                <h3>Escena y punto de entrada</h3>
              </div>
              <Link2 aria-hidden="true" />
            </div>

            {currentScenePath === null ? (
              <p className="sidebar-hint">La escena se guardara antes de configurar la conexion.</p>
            ) : null}

            <button type="button" className="scene-link-file-button" onClick={() => void chooseTargetFile()} disabled={busy}>
              {marker.connection === null ? "Elegir escena destino" : "Reconfigurar conexion"}
            </button>

            {candidate !== null ? (
              <div className="scene-link-candidates">
                <strong>{fileName(candidate.filePath)}</strong>
                {candidate.markers.length === 0 ? <p>No hay puntos de conexion en esta escena.</p> : (
                  <label>
                    Punto de entrada
                    <select value={selectedMarkerId} onChange={(event) => setSelectedMarkerId(event.currentTarget.value)}>
                      <option value="">Selecciona un punto</option>
                      {candidate.markers.map((item) => (
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
              </div>
            ) : null}
          </section>
        </div>

        {error !== null ? <p className="form-error scene-link-modal__error">{error}</p> : null}

        <footer className="scene-link-modal__footer">
          <button type="button" onClick={onClose}>Cancelar</button>
          <div>
            {marker.connection !== null ? (
              <>
                <button type="button" onClick={() => void onNavigate()} disabled={busy}>
                  <ExternalLink aria-hidden="true" />
                  Abrir escena
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

function fileName(filePath: string): string {
  return filePath.replaceAll("\\", "/").split("/").pop() ?? filePath;
}
