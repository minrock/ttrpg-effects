import { useState, type JSX } from "react";
import type {
  MapSceneLinkMarker,
  SceneLinkCandidateFile,
  SceneLinkValidationStatus
} from "../../../../domain/annotations/scene-navigation-links";

interface SceneLinkModalProps {
  readonly marker: MapSceneLinkMarker;
  readonly status: SceneLinkValidationStatus;
  readonly currentScenePath: string | null;
  readonly onRename: (name: string) => void;
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
    <div className="modal-backdrop" onClick={onClose}>
      <section className="scene-link-modal" role="dialog" aria-modal="true" aria-labelledby="scene-link-title" onClick={(event) => event.stopPropagation()}>
        <header className="scene-link-modal__header">
          <div>
            <small>Conexion entre escenas</small>
            <h2 id="scene-link-title">{marker.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        <label>
          Nombre del punto
          <input value={name} maxLength={120} onChange={(event) => setName(event.currentTarget.value)} />
        </label>
        <button type="button" onClick={() => onRename(name.trim())} disabled={name.trim() === "" || name.trim() === marker.name}>
          Guardar nombre
        </button>

        <div className={`scene-link-status is-${status.state}`}>
          <strong>{statusLabel(status)}</strong>
          {status.state === "broken" ? <span>{status.message}</span> : null}
          {marker.connection !== null ? <span>{marker.connection.peer.scenePath}</span> : null}
        </div>

        {currentScenePath === null ? (
          <p className="sidebar-hint">La escena se guardara antes de configurar la conexion.</p>
        ) : null}

        <button type="button" onClick={() => void chooseTargetFile()} disabled={busy}>
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
              Conectar
            </button>
          </div>
        ) : null}

        {marker.connection !== null ? (
          <div className="modal-actions">
            <button type="button" onClick={() => void onNavigate()} disabled={busy}>Abrir escena conectada</button>
            <button type="button" className="is-danger" onClick={() => void disconnect()} disabled={busy}>Desconectar</button>
          </div>
        ) : null}
        {error !== null ? <p className="form-error">{error}</p> : null}
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
