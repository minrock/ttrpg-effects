import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronDown, ChevronRight, Circle, CloudFog, Crosshair, Dices, Eye, EyeOff, Flame, Focus, FolderOpen, GripVertical, Hand, ImagePlus, Layers, Lightbulb, Link2, Map, MapPin, Maximize2, Minus, Monitor, Moon, MoreHorizontal, MousePointer2, MoveRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pencil, Plus, RotateCcw, Ruler, Search, Settings2, Shapes, SlidersHorizontal, Sun, Sunset, Trash2, Triangle, Users, Waves, X, Zap } from "lucide-react";
import type { SceneDocument, SceneEffect } from "../../../domain/sessions/scene-document";
import { addSceneMap, createDefaultSceneMap, renameSceneMap, reorderSceneMaps, setActiveSceneMap, syncActiveMapFromRuntimeFields, upsertSceneMap } from "../../../domain/sessions/scene-maps";
import { updateAnimatedFireEffect } from "../../../domain/effects/fire";
import { updateLightningEffect } from "../../../domain/effects/lightning";
import { updateLightSource } from "../../../domain/lighting/lights";
import { updateShape, type ShapePatch } from "../../../domain/shapes/shapes";
import { getMapAnnotationCenter } from "../../../domain/annotations/map-annotations";
import { createPlayerSceneSnapshot, type ViewportCameraSnapshot } from "../../../domain/player/player-window";
import { FireProperties } from "../components/FireProperties";
import { LightningProperties } from "../components/LightningProperties";
import { CompassOverlay } from "../components/CompassOverlay";
import { LabCanvas, type LabTool } from "./LabCanvas";
import { createLabScene } from "./fixture";
import { LabDice } from "./LabDice";

const mapImage = new URL("../../../../assets/lab/cloister-map.png", import.meta.url).href;
const brandImage = new URL("../../../../assets/logo/ttrpg-effects-icon.png", import.meta.url).href;
type Icon = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
type Shape = "circle" | "cone" | "line" | "paint";
const tools: readonly { id: LabTool; label: string; icon: Icon; key: string }[] = [
  { id: "select", label: "Seleccionar", icon: MousePointer2, key: "V" }, { id: "pan", label: "Mover vista", icon: Hand, key: "H" },
  { id: "measure", label: "Medir", icon: Ruler, key: "M" }, { id: "area", label: "Areas", icon: Shapes, key: "A" },
  { id: "light", label: "Luces", icon: Lightbulb, key: "L" }, { id: "fog", label: "Niebla", icon: CloudFog, key: "N" },
  { id: "fire", label: "Fuego", icon: Flame, key: "F" }, { id: "lightning", label: "Relampago", icon: Zap, key: "R" },
  { id: "water", label: "Agua", icon: Waves, key: "W" }, { id: "pin", label: "Anotaciones", icon: MapPin, key: "P" },
  { id: "pointer", label: "Apuntador", icon: Crosshair, key: "Q" }
];
const shapes: readonly { id: Shape; label: string; icon: Icon }[] = [
  { id: "line", label: "Linea", icon: MoveRight }, { id: "cone", label: "Cono", icon: Triangle },
  { id: "circle", label: "Circulo", icon: Circle }, { id: "paint", label: "Pincel", icon: Pencil }
];
const objectNames: Record<string, string> = { "fire-brazier": "Brasero del patio", "fire-courtyard": "Fogata del jardin", "light-arch": "Luz del arco", "light-river": "Luz del rio", "area-courtyard": "Patio central" };

export function IconButton({ icon: Glyph, label, active, className = "", children, ...props }: { icon: Icon; label: string; active?: boolean; className?: string; children?: ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return <button type="button" className={`lab-icon ${className}`} aria-label={label} title={label} aria-pressed={active} {...props}><Glyph size={18} strokeWidth={1.7} aria-hidden /><span className="lab-tooltip">{label}</span>{children}</button>;
}

function Tabs<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { id: T; label: string; icon?: Icon }[]; value: T; onChange: (id: T) => void }) {
  return <div className="lab-tabs" role="tablist" aria-label={label}>{options.map(({ id, label: name, icon: Glyph }, index) => <button type="button" key={id} role="tab" aria-selected={value === id} tabIndex={value === id ? 0 : -1} onClick={() => onChange(id)} onKeyDown={event => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowRight" ? 1 : options.length - 1)) % options.length;
    onChange(options[next].id); (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
  }}>{Glyph && <Glyph size={15} aria-hidden />}{name}</button>)}</div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="lab-toggle"><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} /><i aria-hidden /></label>;
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="lab-section"><header><h3>{title}</h3>{action}</header>{children}</section>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="lab-dialog" aria-labelledby={id} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><header><h2 id={id}>{title}</h2><IconButton icon={X} label="Cerrar dialogo" onClick={onClose} /></header><div>{children}</div></dialog>;
}

function PlayerPreview({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="lab-player-preview" aria-label="Vista previa del jugador" onCancel={onClose}>{children}</dialog>;
}

export function InterfaceLab() {
  const [scene, setRawScene] = useState(createLabScene);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>(() => ({ [scene.id]: mapImage }));
  const [tool, setTool] = useState<LabTool>("select"), [shape, setShape] = useState<Shape>("circle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth >= 1100), [rightOpen, setRightOpen] = useState(() => window.innerWidth >= 900);
  const [leftTab, setLeftTab] = useState<"scene" | "map">("scene"), [rightTab, setRightTab] = useState<"properties" | "dice">("properties");
  const [collection, setCollection] = useState<"maps" | "notes" | "entities">("maps");
  const [query, setQuery] = useState("");
  const [camera, setCamera] = useState<ViewportCameraSnapshot>({ center: { x: 0, y: 0 }, zoom: .7 });
  const [preview, setPreview] = useState(false), [focus, setFocus] = useState(false), [sceneMenu, setSceneMenu] = useState(false);
  const [environment, setEnvironment] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [note, setNote] = useState<number | null>(null), [notes, setNotes] = useState([{ title: "El juramento del monasterio", text: "La fuente permanece seca desde la ultima luna. Bajo el arco norte hay una inscripcion: solo quien regrese lo que tomo encontrara el paso.\n\nLa campana del santuario marca el cambio de guardia." }, { title: "Preparacion del encuentro", text: "El patio conecta con el puente. Mantener oculta la entrada al santuario hasta que el grupo examine la fuente.\n\nEl brasero sirve como punto de referencia para la camara." }]);
  const inputRef = useRef<HTMLInputElement>(null), replaceRef = useRef(false), dragMap = useRef<string | null>(null);
  const setScene = useCallback((next: SceneDocument) => setRawScene(syncActiveMapFromRuntimeFields(next)), []);
  const activeTool = tools.find(item => item.id === tool)!;
  const ActiveIcon = activeTool.icon;
  const effect = scene.effects.find(item => item.id === selectedId);
  const light = scene.lights.find(item => item.id === selectedId);
  const selectedShape = scene.shapes.find(item => item.id === selectedId);
  const annotation = [...scene.mapAnnotations.pins, ...scene.mapAnnotations.areas, ...scene.mapAnnotations.sceneLinks].find(item => item.id === selectedId);
  const annotationTitle = annotation && (annotation.kind === "room-pin" ? annotation.title : annotation.name);
  const objectList = [...scene.lights.map(item => ({ id: item.id, name: objectNames[item.id] ?? "Luz", icon: Lightbulb, visible: item.visible, group: "Luz" })), ...scene.effects.map(item => ({ id: item.id, name: objectNames[item.id] ?? (item.kind === "fire" ? "Fuego" : item.kind === "lightning" ? "Relampago" : "Efecto"), icon: item.kind === "fire" ? Flame : item.kind === "lightning" ? Zap : Waves, visible: item.visible, group: "Efecto" })), ...scene.shapes.map(item => ({ id: item.id, name: objectNames[item.id] ?? "Area de medida", icon: Shapes, visible: true, group: "Area" }))];
  const selectedName = objectList.find(item => item.id === selectedId)?.name ?? annotationTitle ?? scene.name;
  const matches = (text: string) => text.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const diceContext = useMemo(() => ({ token: `lab:${scene.id}`, sceneId: "ui-lab", mapId: scene.id, sceneName: "El monasterio del rio", mapName: scene.name }), [scene.id, scene.name]);
  const playerScene = useMemo(() => createPlayerSceneSnapshot(scene), [scene]);
  const updateEffect = (next: SceneEffect) => setScene({ ...scene, effects: scene.effects.map(item => item.id === next.id ? next : item) });
  const changeShape = (patch: ShapePatch) => setScene({ ...scene, shapes: scene.shapes.map(item => item.id === selectedId ? updateShape(item, patch) : item) });
  const updateMapName = (name: string) => {
    const map = scene.maps.find(item => item.id === scene.id);
    if (map) setScene(upsertSceneMap(scene, { ...map, name }));
  };
  const choose = (id: string | null) => { setSelectedId(id); if (id) { setRightOpen(true); setRightTab("properties"); setEnvironment(false); if (window.innerWidth < 1100) setLeftOpen(false); } };
  const chooseTool = useCallback((id: LabTool) => {
    if (id === "water") return;
    setTool(id);
    setShape(current => current === "paint" && id !== "fire" ? "circle" : current);
    setSceneMenu(false);
    setEnvironment(id === "fog");
    if (window.innerWidth < 1100) { setLeftOpen(false); setRightOpen(false); }
  }, []);
  const toggleLeft = () => { setLeftOpen(value => !value); if (window.innerWidth < 1100) setRightOpen(false); };
  const toggleRight = () => { setRightOpen(value => !value); if (window.innerWidth < 1100) setLeftOpen(false); };
  const fit = useCallback(() => { if (!viewport) return; const dimensions = scene.map.imageSize ?? { width: 1536, height: 1024 }; setCamera({ center: { x: 0, y: 0 }, zoom: Math.min((viewport.clientWidth - 40) / dimensions.width, (viewport.clientHeight - 110) / dimensions.height) }); }, [viewport, scene.map.imageSize]);
  useEffect(() => { if (ready) fit(); }, [ready, scene.id]); // Fit on initial load/map change, not on each panel resize.
  useEffect(() => {
    const compact = window.matchMedia?.("(max-width: 1099px)");
    if (!compact) return;
    const resize = () => { if (compact.matches) { setLeftOpen(false); setRightOpen(false); } };
    compact.addEventListener("change", resize);
    return () => compact.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.closest("input, textarea, select, [contenteditable=true], dialog, .dice-panel") || event.ctrlKey || event.metaKey || event.altKey)) return;
      if (event.key === "Escape") { setTool("select"); setSceneMenu(false); setPreview(false); setFocus(false); setSelectedId(null); return; }
      const next = tools.find(item => item.key.toLowerCase() === event.key.toLowerCase());
      if (next) { event.preventDefault(); chooseTool(next.id); }
    };
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  }, [chooseTool]);
  const pickImage = (replace: boolean) => { replaceRef.current = replace; inputRef.current?.click(); setSceneMenu(false); };
  const importImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setError("Selecciona una imagen PNG, JPEG o WebP."); return; }
    let url: string;
    const image = new Image();
    try {
      // Pixi's existing asset loader identifies data URLs by MIME; bare blob URLs
      // have no extension and cannot select its image parser automatically.
      url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Imagen invalida"));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      image.src = url;
      await image.decode();
    } catch { setError("No fue posible abrir esta imagen."); return; }
    const imageSize = { width: image.naturalWidth, height: image.naturalHeight };
    if (replaceRef.current) { setImageUrls(current => ({ ...current, [scene.id]: url })); setScene({ ...scene, map: { ...scene.map, imageSize } }); }
    else { const id = crypto.randomUUID(); setImageUrls(current => ({ ...current, [id]: url })); setScene(addSceneMap(scene, createDefaultSceneMap({ id, name: file.name.replace(/\.[^.]+$/, ""), map: { imagePath: null, imageSize, scale: 1, position: { x: 0, y: 0 } }, darkness: { ...scene.darkness, enabled: false }, grid: scene.grid }))); setSelectedId(null); }
    setError(null);
  };
  const reset = () => { const next = createLabScene(); setRawScene(next); setImageUrls({ [next.id]: mapImage }); setSelectedId(null); setTool("select"); setSceneMenu(false); setError(null); fit(); };
  const toggleObject = (id: string) => setScene({ ...scene, effects: scene.effects.map(item => item.id === id ? { ...item, visible: !item.visible } : item), lights: scene.lights.map(item => item.id === id ? { ...item, visible: !item.visible } : item) });
  const removeSelected = () => { setScene({ ...scene, effects: scene.effects.filter(item => item.id !== selectedId), lights: scene.lights.filter(item => item.id !== selectedId), shapes: scene.shapes.filter(item => item.id !== selectedId) }); setSelectedId(null); };
  const showShapeTools = ["fire", "lightning", "area", "light"].includes(tool);

  return <div className={`lab-app${focus ? " is-focus" : ""}${preview ? " is-player" : ""}`}>
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => void importImage(event)} aria-label="Imagen para el laboratorio" />
    <header className="lab-topbar">
      <a className="lab-brand" href="/ui-lab.html" aria-label="TTRPG Effects laboratorio"><img src={brandImage} alt="" /><span>TTRPG <strong>Effects</strong></span><small>LAB</small></a>
      <span className="lab-top-divider" />
      <div className="lab-scene-menu" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setSceneMenu(false); event.currentTarget.querySelector<HTMLButtonElement>(".lab-scene-title")?.focus(); } }}><button type="button" className="lab-scene-title" aria-expanded={sceneMenu} aria-haspopup="menu" onClick={() => setSceneMenu(value => !value)}><span><small>ESCENA</small><strong>El monasterio del rio</strong></span><ChevronDown size={15} /></button>
        {sceneMenu && <><button className="lab-menu-dismiss" aria-label="Cerrar menu de escena" onClick={() => setSceneMenu(false)} /><div className="lab-menu" role="menu"><button role="menuitem" onClick={() => pickImage(false)}><ImagePlus size={16} />Agregar mapa</button><button role="menuitem" onClick={() => pickImage(true)}><FolderOpen size={16} />Actualizar imagen del mapa</button><hr /><button role="menuitem" onClick={reset}><RotateCcw size={16} />Restablecer demo</button></div></>}
      </div>
      <div className="lab-session-state"><span />Sesion local</div>
      <div className="lab-top-actions"><IconButton icon={BookOpen} label="Notas de la escena" onClick={() => { setLeftTab("scene"); setCollection("notes"); setLeftOpen(true); if (window.innerWidth < 1100) setRightOpen(false); }} /><IconButton icon={Dices} label="Abrir dados" active={rightOpen && rightTab === "dice"} onClick={() => { setRightTab("dice"); setRightOpen(true); if (window.innerWidth < 1100) setLeftOpen(false); }} /><span className="lab-top-divider" /><button className="lab-present" aria-label="Vista del jugador" onClick={() => setPreview(true)}><Monitor size={16} /><span>Vista del jugador</span></button></div>
    </header>
    <div className="lab-workspace">
      <nav className="lab-tool-rail" aria-label="Herramientas del mapa">
        <IconButton icon={leftOpen ? PanelLeftClose : PanelLeftOpen} label={leftOpen ? "Cerrar explorador" : "Abrir explorador"} active={leftOpen} onClick={toggleLeft} />
        <hr />{tools.map(({ id, label, icon, key }, index) => <div key={id} className={index === 2 || index === 6 || index === 9 ? "lab-tool-separator" : ""}><IconButton icon={icon} label={`${label} (${key})`} active={tool === id} disabled={id === "water"} title={id === "water" ? "Agua: disponible en la aplicacion de escritorio" : `${label} (${key})`} onClick={() => chooseTool(id)} /></div>)}
        <div className="lab-tool-spacer" /><IconButton icon={Settings2} label="Ajustes de mapa" active={rightOpen && !selectedId && rightTab === "properties"} onClick={() => { choose(null); setEnvironment(false); setRightOpen(true); setRightTab("properties"); if (window.innerWidth < 1100) setLeftOpen(false); }} />
      </nav>
      <aside className={`lab-explorer${leftOpen ? " is-open" : ""}`} aria-label="Explorador" hidden={!leftOpen}>
        <div className="lab-panel-heading"><span>EXPLORADOR</span><IconButton icon={PanelLeftClose} label="Plegar explorador" onClick={toggleLeft} /></div>
        <Tabs label="Ambito del explorador" value={leftTab} onChange={value => { setLeftTab(value); setQuery(""); }} options={[{ id: "scene", label: "Escena", icon: Layers }, { id: "map", label: "Mapa", icon: Map }]} />
        <label className="lab-search"><Search size={16} /><input aria-label="Buscar en el explorador" placeholder={leftTab === "scene" ? "Buscar en la escena..." : "Buscar en el mapa..."} value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Limpiar busqueda" onClick={() => setQuery("")}><X size={13} /></button>}</label>
        <div className="lab-explorer-scroll">
          {leftTab === "scene" ? <>
            <div className="lab-collection-tabs" role="group" aria-label="Contenido de escena">{([{ id: "maps", label: "Mapas", icon: Map, count: scene.maps.length }, { id: "notes", label: "Notas", icon: BookOpen, count: notes.length }, { id: "entities", label: "Entidades", icon: Users, count: 0 }] as const).map(({ id, label, icon: Glyph, count }) => <button key={id} aria-pressed={collection === id} onClick={() => { setCollection(id); setQuery(""); }}><Glyph size={16} /><span>{label}</span><small>{count}</small></button>)}</div>
            {collection === "maps" && <Section title="Mapas de la escena" action={<IconButton icon={Plus} label="Agregar mapa" onClick={() => pickImage(false)} />}>
              <div className="lab-map-list">{scene.maps.filter(item => matches(item.name)).map((item, index) => <div key={item.id} className={`lab-map-item${item.id === scene.id ? " is-active" : ""}`} draggable onDragStart={() => { dragMap.current = item.id; }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const ids = scene.maps.map(map => map.id); const from = ids.indexOf(dragMap.current ?? ""); const to = ids.indexOf(item.id); if (from < 0 || to < 0) return; ids.splice(from, 1); ids.splice(to, 0, dragMap.current!); setScene(reorderSceneMaps(scene, ids)); dragMap.current = null; }}>
                <button className="lab-map-select" aria-pressed={item.id === scene.id} onClick={() => { setScene(setActiveSceneMap(scene, item.id)); setSelectedId(null); }}><div className="lab-map-thumbnail"><img src={imageUrls[item.id]} alt="" draggable={false} /><span>{String(index + 1).padStart(2, "0")}</span>{item.id === scene.id && <i><Check size={12} />Activo</i>}</div><span className="lab-map-name">{item.name}<GripVertical size={14} /></span></button>
              </div>)}</div>
              <button className="lab-add-map" onClick={() => pickImage(false)}><Plus size={15} />Agregar mapa</button>
            </Section>}
            {collection === "notes" && <Section title="Diario de la escena" action={<IconButton icon={Plus} label="Nueva nota de prueba" onClick={() => { setNotes(current => [...current, { title: "Nueva nota", text: "" }]); setNote(notes.length); }} />}>{notes.map((item, index) => matches(item.title) && <button className="lab-note-row" key={index} onClick={() => setNote(index)}><BookOpen size={16} /><span><strong>{item.title}</strong><small>Solo DM</small></span><ChevronRight size={14} /></button>)}</Section>}
            {collection === "entities" && <Section title="Entidades de escena"><div className="lab-empty"><Users size={25} /><span>Sin entidades en esta escena</span></div><button className="lab-add-map" disabled title="Las bibliotecas permanecen en la aplicacion de escritorio"><Plus size={15} />Agregar entidad</button></Section>}
            {collection === "maps" && <Section title="Notas recientes">{notes.slice(0, 2).map((item, index) => <button className="lab-note-row" key={index} onClick={() => setNote(index)}><BookOpen size={15} /><span><strong>{item.title}</strong><small>Solo DM</small></span></button>)}</Section>}
          </> : <>
            <Section title="Anotaciones" action={<span className="lab-count">{scene.mapAnnotations.pins.length + scene.mapAnnotations.areas.length + scene.mapAnnotations.sceneLinks.length}</span>}>
              <div className="lab-annotation-actions"><button onClick={() => chooseTool("pin")}><MapPin size={16} />Pin de habitacion<Plus size={14} /></button><button onClick={() => { chooseTool("area"); setShape("paint"); }}><Shapes size={16} />Area de informacion<Plus size={14} /></button><button disabled title="Conexiones entre mapas disponibles en la aplicacion"><Link2 size={16} />Conexion entre mapas<Plus size={14} /></button></div>
              {scene.mapAnnotations.pins.filter(item => matches(item.title)).map(item => <button className="lab-note-row" key={item.id} onClick={() => { choose(item.id); setCamera(current => ({ ...current, center: item.position })); }}><MapPin size={15} /><span><strong>{item.title}</strong><small>Habitacion</small></span></button>)}
              {scene.mapAnnotations.areas.filter(item => matches(item.name)).map(item => <button className="lab-note-row" key={item.id} onClick={() => { choose(item.id); setCamera(current => ({ ...current, center: getMapAnnotationCenter(item) })); }}><Shapes size={15} /><span><strong>{item.name}</strong><small>Area de informacion</small></span></button>)}
            </Section>
            <Section title="Objetos del mapa" action={<span className="lab-count">{objectList.length}</span>}><div className="lab-object-list">{objectList.filter(item => matches(item.name)).map(item => <div key={item.id} className={item.id === selectedId ? "is-selected" : ""}><button onClick={() => choose(item.id)}><item.icon size={16} /><span>{item.name}<small>{item.group}</small></span></button>{item.group !== "Area" && <IconButton icon={item.visible ? Eye : EyeOff} label={`${item.visible ? "Ocultar" : "Mostrar"} ${item.name}`} onClick={() => toggleObject(item.id)} />}</div>)}</div></Section>
          </>}
        </div><footer className="lab-panel-footer"><span className="lab-status-dot" />{scene.maps.length} mapa{scene.maps.length !== 1 ? "s" : ""}<span>En memoria</span></footer>
      </aside>
      <main ref={setViewport} className="lab-map-stage" aria-label="Mesa de juego">
        <LabCanvas scene={preview ? playerScene : scene} imageUrl={imageUrls[scene.id] ?? mapImage} tool={preview ? "select" : tool} shape={shape} selectedId={preview ? null : selectedId} camera={camera} onCameraChange={setCamera} onSelect={choose} onSceneChange={setScene} onReady={() => setReady(true)} onError={setError} onToolComplete={() => setTool("select")} player={preview} />
        {!ready && <div className="lab-loading" role="status">Cargando mapa...</div>}
        <div className="lab-map-header"><span className="lab-map-breadcrumb"><Map size={14} />{scene.name}</span><div><IconButton icon={focus ? PanelLeftOpen : Maximize2} label={focus ? "Restaurar paneles" : "Concentrarse en el mapa"} active={focus} onClick={() => setFocus(value => !value)} /><IconButton icon={rightOpen ? PanelRightClose : PanelRightOpen} label={rightOpen ? "Cerrar inspector" : "Abrir inspector"} onClick={toggleRight} /></div></div>
        <div className="lab-contextbar"><ActiveIcon size={16} /><span>{activeTool.label}</span>{showShapeTools && <><i />{shapes.filter(item => tool === "light" ? item.id === "circle" || item.id === "cone" : item.id !== "paint" || tool === "fire" || tool === "area").map(({ id, label, icon: Glyph }) => <IconButton key={id} icon={Glyph} label={`${activeTool.label}: ${label}`} active={shape === id} onClick={() => setShape(id)} />)}</>}{tool === "fog" && <><i /><label>Pincel <input aria-label="Pincel de niebla en cuadros" type="number" min="0.25" max="10" step="0.25" value={scene.fogOfWar.revealRadius / scene.grid.cellSizeWorld} onChange={event => { const size = event.target.valueAsNumber; if (Number.isFinite(size) && size > 0) setScene({ ...scene, fogOfWar: { ...scene.fogOfWar, revealRadius: size * scene.grid.cellSizeWorld } }); }} /></label></>}{tool !== "select" && <IconButton icon={X} label="Salir de la herramienta" onClick={() => setTool("select")} />}</div>
        <div className="lab-compass"><CompassOverlay orientation={scene.compassOrientation} variant={preview ? "player" : "dm"} /></div>
        <div className="lab-canvas-bottom"><button className="lab-environment-badge" aria-label="Ambiente del mapa" aria-pressed={environment && rightOpen} onClick={() => { setEnvironment(value => !value); setRightTab("properties"); setRightOpen(true); if (window.innerWidth < 1100) setLeftOpen(false); }}><Sun size={15} /><span>{scene.daytimeFilter.enabled ? ({ day: "Dia", sunset: "Atardecer", night: "Noche" })[scene.daytimeFilter.preset] : "Luz natural"}</span><ChevronDown size={13} /></button><div className="lab-navigation"><IconButton icon={Minus} label="Alejar mapa" onClick={() => setCamera(current => ({ ...current, zoom: Math.max(.05, current.zoom / 1.2) }))} /><button className="lab-zoom" title="Restablecer zoom al 100%" onClick={() => setCamera(current => ({ ...current, zoom: 1 }))}>{Math.round(camera.zoom * 100)}%</button><IconButton icon={Plus} label="Acercar mapa" onClick={() => setCamera(current => ({ ...current, zoom: Math.min(8, current.zoom * 1.2) }))} /><i /><IconButton icon={Focus} label="Ajustar mapa a la ventana" onClick={fit} /></div></div>
        {error && <div className="lab-error" role="alert">{error}<IconButton icon={X} label="Cerrar aviso" onClick={() => setError(null)} /></div>}
      </main>
      <aside className={`lab-inspector${rightOpen ? " is-open" : ""}`} aria-label="Inspector" hidden={!rightOpen}>
        <div className="lab-panel-heading"><span>INSPECTOR</span><IconButton icon={PanelRightClose} label="Plegar inspector" onClick={toggleRight} /></div>
        <Tabs label="Panel derecho" value={rightTab} onChange={setRightTab} options={[{ id: "properties", label: "Propiedades", icon: SlidersHorizontal }, { id: "dice", label: "Dados", icon: Dices }]} />
        <div className="lab-inspector-scroll">
          {rightTab === "properties" && <>
            <div className="lab-inspector-title"><span className={`lab-type-icon${effect?.kind === "fire" ? " is-fire" : ""}`}>{effect?.kind === "fire" ? <Flame size={20} /> : light ? <Lightbulb size={20} /> : environment ? <Sun size={20} /> : <Map size={20} />}</span><div><small>{environment ? "AMBIENTE" : selectedId ? "SELECCION" : "MAPA ACTIVO"}</small><h2>{environment ? "Luz y atmosfera" : selectedName}</h2></div>{selectedId && <IconButton icon={X} label="Quitar seleccion" onClick={() => setSelectedId(null)} />}</div>
            {environment ? <>
              <Section title="Hora del dia"><div className="lab-time-options">{([{ id: "day", label: "Dia", icon: Sun }, { id: "sunset", label: "Tarde", icon: Sunset }, { id: "night", label: "Noche", icon: Moon }] as const).map(({ id, label, icon: Glyph }) => <button key={id} aria-pressed={scene.daytimeFilter.preset === id} onClick={() => setScene({ ...scene, daytimeFilter: { ...scene.daytimeFilter, enabled: id !== "day", preset: id } })}><Glyph size={20} />{label}</button>)}</div></Section>
              <Section title="Oscuridad"><Toggle label="Oscuridad activa" checked={scene.darkness.enabled} onChange={enabled => setScene({ ...scene, darkness: { ...scene.darkness, enabled } })} /><label className="lab-range">Opacidad<output>{Math.round(scene.darkness.opacity * 100)}%</output><input type="range" min="0" max="1" step="0.05" aria-label="Opacidad de oscuridad" value={scene.darkness.opacity} onChange={event => setScene({ ...scene, darkness: { ...scene.darkness, opacity: event.target.valueAsNumber } })} /></label><Toggle label="Vision en la oscuridad" checked={scene.darkness.darkvisionEnabled} onChange={darkvisionEnabled => setScene({ ...scene, darkness: { ...scene.darkness, darkvisionEnabled } })} /></Section>
              <Section title="Niebla de guerra"><Toggle label="Niebla activa" checked={scene.fogOfWar.enabled} onChange={enabled => setScene({ ...scene, fogOfWar: { ...scene.fogOfWar, enabled } })} /><button className="lab-secondary" onClick={() => chooseTool("fog")}><Pencil size={15} />Revelar zonas</button></Section>
            </> : effect?.kind === "fire" ? <Section title="Fuego"><FireProperties effect={effect} grid={scene.grid} settings={scene.settings} onChange={patch => updateEffect(updateAnimatedFireEffect(effect, patch))} /></Section>
              : effect?.kind === "lightning" ? <Section title="Relampago"><LightningProperties effect={effect} grid={scene.grid} settings={scene.settings} onChange={patch => updateEffect(updateLightningEffect(effect, patch, Date.now()))} /></Section>
                : light ? <Section title="Fuente de luz"><Toggle label="Visible" checked={light.visible} onChange={visible => setScene({ ...scene, lights: scene.lights.map(item => item.id === light.id ? updateLightSource(item, { visible }) : item) })} /><label className="lab-field">Color<input aria-label="Color de luz" type="color" value={light.color} onChange={event => setScene({ ...scene, lights: scene.lights.map(item => item.id === light.id ? updateLightSource(item, { color: event.target.value }) : item) })} /></label><label className="lab-range">Intensidad<output>{Math.round(light.intensity * 100)}%</output><input aria-label="Intensidad de luz" type="range" min="0" max="1" step=".05" value={light.intensity} onChange={event => setScene({ ...scene, lights: scene.lights.map(item => item.id === light.id ? updateLightSource(item, { intensity: event.target.valueAsNumber }) : item) })} /></label></Section>
                  : selectedShape ? <Section title={selectedShape.type === "measurement" ? "Medicion" : "Area de medida"}>
                    <div className="lab-field">Geometria<span>{({ circle: "Circulo", cone: "Cono", measurement: "Linea", rectangle: "Rectangulo", path: "Ruta" })[selectedShape.type]}</span></div>
                    {selectedShape.radius !== undefined && <label className="lab-field">Radio (cuadros)<input aria-label="Radio del area en cuadros" type="number" min="0.25" step="0.25" value={selectedShape.radius / scene.grid.cellSizeWorld} onChange={event => { const value = event.target.valueAsNumber; if (Number.isFinite(value) && value > 0) changeShape({ radius: value * scene.grid.cellSizeWorld }); }} /></label>}
                    {selectedShape.type === "cone" && <label className="lab-field">Direccion<input aria-label="Direccion del cono" type="number" step="15" value={selectedShape.direction ?? 0} onChange={event => { const value = event.target.valueAsNumber; if (Number.isFinite(value)) changeShape({ direction: value }); }} /></label>}
                    <div className="lab-field">Puntos<span>{selectedShape.points.length}</span></div>
                  </Section> : annotation ? <Section title="Anotacion"><p className="lab-note-body">{annotationTitle}</p></Section> : <>
                    <Section title="General"><label className="lab-field is-stacked">Nombre<input aria-label="Nombre del mapa" value={scene.name} onChange={event => updateMapName(event.target.value)} onBlur={() => setScene(renameSceneMap(scene, scene.id, scene.name.trim() || "Mapa sin nombre"))} /></label><label className="lab-field">Fondo del mapa<input type="color" aria-label="Color de fondo del mapa" value={scene.backgroundColor} onChange={event => setScene({ ...scene, backgroundColor: event.target.value })} /></label><button className="lab-secondary" onClick={() => pickImage(true)}><ImagePlus size={15} />Actualizar imagen</button></Section>
                    <Section title="Grilla"><Toggle label="Mostrar grilla" checked={scene.grid.enabled} onChange={enabled => setScene({ ...scene, grid: { ...scene.grid, enabled } })} /><Toggle label="Ajustar a la grilla" checked={scene.settings.snapToGrid} onChange={snapToGrid => setScene({ ...scene, settings: { ...scene.settings, snapToGrid } })} /><label className="lab-field">Distancia por celda<span className="lab-unit"><input type="number" min="1" max="100" aria-label="Distancia por celda" value={scene.grid.distancePerCell} onChange={event => { const value = event.target.valueAsNumber; if (value > 0 && Number.isFinite(value)) setScene({ ...scene, grid: { ...scene.grid, distancePerCell: value } }); }} /><span>{scene.grid.unit}</span></span></label><label className="lab-range">Opacidad<output>{Math.round(scene.grid.opacity * 100)}%</output><input aria-label="Opacidad de grilla" type="range" min="0" max="1" step=".05" value={scene.grid.opacity} onChange={event => setScene({ ...scene, grid: { ...scene.grid, opacity: event.target.valueAsNumber } })} /></label></Section>
                    <Section title="Orientacion"><div className="lab-direction" role="group" aria-label="Orientacion del norte">{([{ value: 0, icon: ArrowUp }, { value: 90, icon: ArrowRight }, { value: 180, icon: ArrowDown }, { value: 270, icon: ArrowLeft }] as const).map(({ value, icon }) => <IconButton key={value} icon={icon} label={`Norte a ${value} grados`} active={scene.compassOrientation === value} onClick={() => setScene({ ...scene, compassOrientation: value })} />)}</div></Section>
                  </>}
            {(effect || light || selectedShape) && !environment && <div className="lab-inspector-delete"><button onClick={removeSelected}><Trash2 size={14} />Eliminar del mapa</button></div>}
          </>}
          <LabDice active={rightTab === "dice"} viewport={viewport} context={diceContext} />
        </div>
        <footer className="lab-inspector-footer"><button aria-pressed={environment} onClick={() => { setEnvironment(value => !value); setRightTab("properties"); }}><Sun size={15} />Ambiente<ChevronRight size={14} /></button></footer>
      </aside>
    </div>
    <footer className="lab-statusbar"><span><span className="lab-status-dot" />{ready ? "Mesa preparada" : "Preparando mesa"}</span><span>{scene.grid.distancePerCell} {scene.grid.unit} / celda</span><span className="lab-statusbar-right">{objectList.length} objetos<IconButton icon={MoreHorizontal} label="Opciones de escena" onClick={() => setSceneMenu(value => !value)} /></span></footer>
    {note !== null && notes[note] && <Modal title="Nota de escena" onClose={() => setNote(null)}><label className="lab-field is-stacked">Titulo<input value={notes[note].title} onChange={event => setNotes(current => current.map((item, index) => index === note ? { ...item, title: event.target.value } : item))} /></label><label className="lab-field is-stacked">Contenido<textarea rows={10} value={notes[note].text} onChange={event => setNotes(current => current.map((item, index) => index === note ? { ...item, text: event.target.value } : item))} /></label><div className="lab-dialog-footer"><span><EyeOff size={14} />Solo DM</span><button className="lab-present" onClick={() => setNote(null)}><Check size={15} />Listo</button></div></Modal>}
    {preview && <PlayerPreview onClose={() => setPreview(false)}><div className="lab-player-preview-header"><span><Monitor size={16} />Vista del jugador</span><button className="lab-present" autoFocus onClick={() => setPreview(false)}><ArrowLeft size={16} />Volver al DM</button></div></PlayerPreview>}
  </div>;
}
