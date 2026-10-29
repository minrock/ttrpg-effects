// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { act, useState, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SceneAside } from "../../../../domain/sessions/scene-aside";
import { createDefaultSceneMap } from "../../../../domain/sessions/scene-maps";
import { builtInMonsterTemplates } from "../../../../domain/monster-templates/monster-template";
import { DEFAULT_MAP_BACKGROUND_COLOR } from "../../../../domain/map/map-background";
import { DmAsidePanel } from "./DmAsidePanel";
import { MonsterSection } from "./MonsterSection";
import { NpcSection } from "./NpcSection";
import { PlayerCharacterSection } from "./PlayerCharacterSection";
import { NotesSection } from "./NotesSection";

// Keep library/editor boundaries observable without mounting their privileged services.
vi.mock("./MonsterSection", () => ({
  MonsterSection: vi.fn<typeof MonsterSection>(() => <EditorProbe name="Monstruos" />)
}));
vi.mock("./NpcSection", () => ({
  NpcSection: vi.fn<typeof NpcSection>(() => <EditorProbe name="NPCs" />)
}));
vi.mock("./PlayerCharacterSection", () => ({
  PlayerCharacterSection: vi.fn<typeof PlayerCharacterSection>(() => <EditorProbe name="Personajes" />)
}));
vi.mock("./NotesSection", () => ({
  NotesSection: vi.fn<typeof NotesSection>(() => <EditorProbe name="Notas" />)
}));

function EditorProbe({ name }: { name: string }) {
  const [draft, setDraft] = useState("");
  return <input aria-label={`Borrador ${name}`} value={draft} onChange={(event) => setDraft(event.currentTarget.value)} />;
}

type Props = ComponentProps<typeof DmAsidePanel>;
const aside: SceneAside = {
  monsters: [{ id: "monster", name: "Guardian", imagePath: null, visibleToPlayer: false, notes: "Vigila" }],
  npcs: [{ id: "npc", name: "Mercader", imagePath: null, visibleToPlayer: true, notes: "Vende" }],
  playerCharacters: [{
    id: "pc", characterName: "Mira", playerName: "Ana", level: "3", species: "Humana", classes: "Maga",
    imagePath: null, stats: { strength: "10", constitution: "12", dexterity: "14", intelligence: "16", wisdom: "13", charisma: "11" },
    initiative: "2", armorClass: "12", passivePerception: "11", hitPoints: "18", spellSaveDc: "13", speeds: "30", notes: "Preparada"
  }],
  notes: [
    { id: "note", parentId: null, name: "Sesion", content: "Notas" },
    { id: "child", parentId: "note", name: "Pista", content: "Llave" }
  ]
};

function createProps(): Props {
  return {
    maps: [createDefaultSceneMap({ id: "entry", name: "Entrada" }), createDefaultSceneMap({ id: "crypt", name: "Cripta" })],
    activeMapId: "entry", backgroundColor: "#123456", aside, monsterTemplates: builtInMonsterTemplates,
    objects: [{ id: "fire", collection: "effects", group: "Efectos", label: "Fuego", visible: true, center: { x: 20, y: 40 } }],
    annotations: {
      pins: [{ id: "pin", kind: "room-pin", title: "Sala", content: "", position: { x: 0, y: 0 }, locked: false }],
      areas: [{ id: "area", kind: "information-area", areaType: "trap", name: "Foso", description: "", cells: [], locked: false }],
      sceneLinks: [{ id: "link", kind: "scene-link", name: "Salida", position: { x: 10, y: 10 }, locked: false, connection: null }]
    },
    selectedElementId: "fire", activeAnnotationTool: "information-area",
    sceneLinkStatuses: { link: { state: "broken", reason: "file-missing", message: "No existe" } },
    onBackgroundColorChange: vi.fn(), onSelectMap: vi.fn(), onRenameMap: vi.fn(), onReorderMaps: vi.fn(),
    onDeleteMap: vi.fn(), onAddMap: vi.fn(), onImportSceneAsMap: vi.fn(), onReplaceMapImage: vi.fn(),
    onSelectObject: vi.fn(), onLocateObject: vi.fn(), onDeleteObject: vi.fn(), onChange: vi.fn(),
    onSelectAnnotation: vi.fn(), onDeleteInformationArea: vi.fn(), onGoToAnnotation: vi.fn(),
    onEditAnnotation: vi.fn(), onToggleAnnotationLock: vi.fn(), onHighlightInformationArea: vi.fn(),
    onStartRoomPin: vi.fn(), onStartInformationArea: vi.fn(), onStartSceneLink: vi.fn()
  };
}

describe("DmAsidePanel explorer", () => {
  let container: HTMLDivElement;
  let root: Root;
  let props: Props;
  let style: HTMLStyleElement;

  function render(overrides: Partial<Props> = {}): void {
    props = { ...props, ...overrides };
    act(() => root.render(<DmAsidePanel {...props} />));
  }

  function query<T extends Element = HTMLElement>(selector: string): T {
    const element = container.querySelector<T>(selector);
    expect(element, selector).not.toBeNull();
    return element!;
  }

  function button(text: string, selector = "button"): HTMLButtonElement {
    const element = [...container.querySelectorAll<HTMLButtonElement>(selector)]
      .find((item) => item.textContent?.trim().startsWith(text));
    expect(element, text).toBeDefined();
    return element!;
  }

  function click(element: HTMLElement): void { act(() => element.click()); }
  function tab(name: "Escena" | "Mapa"): HTMLButtonElement { return button(name, '[role="tab"]'); }
  function section(name: string): HTMLButtonElement { return button(name, ".dm-aside-accordion-header"); }
  function input(label: string): HTMLInputElement { return query(`input[aria-label="${label}"]`); }
  function change(element: HTMLInputElement, value: string): void {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  function key(element: HTMLElement, key: string, options: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
    act(() => element.dispatchEvent(event));
    return event;
  }
  function panelFor(element: HTMLButtonElement): HTMLElement {
    const panel = document.getElementById(element.getAttribute("aria-controls")!);
    expect(panel).not.toBeNull();
    return panel!;
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    container = document.createElement("div");
    container.className = "vtt-interface";
    document.body.append(container);
    root = createRoot(container);
    style = document.createElement("style");
    style.textContent = readFileSync(new NodeURL("./interface-explorer.css", import.meta.url), "utf8");
    document.head.append(style);
    props = createProps();
    render();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    style.remove();
    vi.restoreAllMocks();
  });

  it("links each tab to its mounted panel and keeps only the selected tab in the tab order", () => {
    const scene = tab("Escena"), map = tab("Mapa");
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(2);
    for (const item of [scene, map]) {
      expect(panelFor(item).getAttribute("role")).toBe("tabpanel");
      expect(panelFor(item).getAttribute("aria-labelledby")).toBe(item.id);
    }
    expect(scene.tabIndex).toBe(0);
    expect(map.tabIndex).toBe(-1);
    expect(panelFor(scene).hidden).toBe(false);
    expect(getComputedStyle(panelFor(map)).display).toBe("none");
    click(map);
    expect(scene.getAttribute("aria-selected")).toBe("false");
    expect(map.getAttribute("aria-selected")).toBe("true");
    expect(scene.tabIndex).toBe(-1);
    expect(map.tabIndex).toBe(0);
    expect(getComputedStyle(panelFor(scene)).display).toBe("none");
    expect(panelFor(map).hidden).toBe(false);
  });

  it("activates and focuses tabs with wrapping arrows, Home and End without bubbling shortcuts", () => {
    const scene = tab("Escena"), map = tab("Mapa");
    const bubble = vi.fn();
    document.body.addEventListener("keydown", bubble);
    scene.focus();
    for (const [pressed, expected] of [
      ["ArrowLeft", map], ["ArrowRight", scene], ["End", map], ["Home", scene],
      ["ArrowRight", map], ["ArrowRight", scene]
    ] as const) {
      expect(key(document.activeElement as HTMLElement, pressed).defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(expected);
      expect(expected.getAttribute("aria-selected")).toBe("true");
      expect(expected.tabIndex).toBe(0);
    }
    document.body.removeEventListener("keydown", bubble);
    expect(bubble).not.toHaveBeenCalled();
    expect(key(scene, "Tab").defaultPrevented).toBe(false);
    expect(key(scene, "ArrowRight", { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(scene.getAttribute("aria-selected")).toBe("true");
  });

  it("keeps tab and section IDs unique across multiple explorer instances", () => {
    act(() => root.render(<><DmAsidePanel {...props} /><DmAsidePanel {...props} /></>));
    const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    click(tabs[3]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");
    expect(tabs[2].getAttribute("aria-selected")).toBe("false");
    expect(tabs[3].getAttribute("aria-selected")).toBe("true");
    expect(panelFor(tabs[1]).hidden).toBe(true);
    expect(panelFor(tabs[3]).hidden).toBe(false);
  });

  it("does not intercept editing or navigation keys inside inputs", () => {
    const name = input("Nombre de Entrada");
    name.focus();
    for (const pressed of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
      expect(key(name, pressed).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(name);
      expect(tab("Escena").getAttribute("aria-selected")).toBe("true");
    }
  });

  it("retains drafts, search, group expansion and DOM identity through tabs and panel hiding", () => {
    const drafts = ["Monstruos", "NPCs", "Personajes", "Notas"].map((name) => input(`Borrador ${name}`));
    drafts.forEach((draft) => change(draft, "Borrador sin guardar"));
    click(tab("Mapa"));
    const objects = input("Buscar objetos"), annotations = input("Buscar anotaciones");
    click(button("Efectos", ".scene-object-group"));
    change(annotations, "Sala");
    change(objects, "Fuego");
    click(tab("Escena"));
    render({ hidden: true });
    expect(getComputedStyle(query("aside")).display).toBe("none");
    render({ hidden: false });
    drafts.forEach((draft) => {
      expect(input(draft.getAttribute("aria-label")!)).toBe(draft);
      expect(draft.value).toBe("Borrador sin guardar");
    });
    click(tab("Mapa"));
    expect(input("Buscar objetos")).toBe(objects);
    expect(input("Buscar anotaciones")).toBe(annotations);
    expect(objects.value).toBe("Fuego");
    expect(annotations.value).toBe("Sala");
    change(objects, "");
    expect(button("Efectos", ".scene-object-group").getAttribute("aria-expanded")).toBe("false");
  });

  it("links accordion controls, retains their children and keeps Maps independent from Objects", () => {
    const notes = input("Borrador Notas");
    change(notes, "Sin cerrar el editor");
    click(section("Notas"));
    expect(section("Notas").getAttribute("aria-expanded")).toBe("false");
    expect(panelFor(section("Notas")).hidden).toBe(true);
    expect(getComputedStyle(panelFor(section("Notas"))).display).toBe("none");
    click(section("Notas"));
    expect(input("Borrador Notas")).toBe(notes);
    expect(notes.value).toBe("Sin cerrar el editor");
    click(section("Mapas"));
    click(tab("Mapa"));
    expect(section("Objetos").getAttribute("aria-expanded")).toBe("true");
    const search = input("Buscar objetos");
    change(search, "Fuego");
    click(section("Objetos"));
    click(section("Objetos"));
    expect(input("Buscar objetos")).toBe(search);
    expect(search.value).toBe("Fuego");
    click(tab("Escena"));
    expect(section("Mapas").getAttribute("aria-expanded")).toBe("false");
  });

  it("forwards every map action and replacement busy state to the real map list", () => {
    click(button("Agregar mapa"));
    click(button("Agregar a escena"));
    click(query('[aria-label="Seleccionar Cripta"]'));
    change(input("Nombre de Cripta"), "Cripta norte");
    click(query('[aria-label="Actualizar imagen de Cripta"]'));
    click(query('[aria-label="Eliminar Cripta"]'));
    expect(props.onAddMap).toHaveBeenCalledOnce();
    expect(props.onImportSceneAsMap).toHaveBeenCalledOnce();
    expect(props.onSelectMap).toHaveBeenCalledExactlyOnceWith("crypt");
    expect(props.onRenameMap).toHaveBeenCalledExactlyOnceWith("crypt", "Cripta norte");
    expect(props.onReplaceMapImage).toHaveBeenCalledExactlyOnceWith("crypt");
    expect(props.onDeleteMap).toHaveBeenCalledExactlyOnceWith("crypt");
    const rows = container.querySelectorAll(".scene-map-list li");
    const drag = new Event("dragstart", { bubbles: true });
    Object.defineProperty(drag, "dataTransfer", { value: { setData: vi.fn(), effectAllowed: "none" } });
    act(() => rows[1].dispatchEvent(drag));
    act(() => rows[0].dispatchEvent(new Event("drop", { bubbles: true, cancelable: true })));
    expect(props.onReorderMaps).toHaveBeenCalledExactlyOnceWith(["crypt", "entry"]);
    render({ isReplacingImage: true });
    expect(query<HTMLButtonElement>('[aria-label="Actualizar imagen de Cripta"]').disabled).toBe(true);
  });

  it("preserves background controls and guards reset without an active map", () => {
    click(tab("Mapa"));
    change(input("Color de fondo infinito"), "#345678");
    expect(props.onBackgroundColorChange).toHaveBeenCalledWith("#345678");
    const reset = query<HTMLButtonElement>('[aria-label="Restablecer fondo"]');
    expect(reset.title).toBe("Restablecer fondo");
    click(reset);
    expect(props.onBackgroundColorChange).toHaveBeenLastCalledWith(DEFAULT_MAP_BACKGROUND_COLOR);
    render({ backgroundColor: DEFAULT_MAP_BACKGROUND_COLOR });
    expect(reset.disabled).toBe(true);
    render({ activeMapId: null, backgroundColor: "#123456" });
    expect(reset.disabled).toBe(true);
    expect(input("Color de fondo infinito").disabled).toBe(true);
  });

  it("preserves object selection, location and deletion", () => {
    click(tab("Mapa"));
    expect(query(".scene-object-select").getAttribute("aria-pressed")).toBe("true");
    click(query(".scene-object-select"));
    click(query('[aria-label="Centrar Fuego"]'));
    click(query('[aria-label="Borrar Fuego"]'));
    expect(props.onSelectObject).toHaveBeenCalledExactlyOnceWith(props.objects[0]);
    expect(props.onLocateObject).toHaveBeenCalledExactlyOnceWith(props.objects[0]);
    expect(props.onDeleteObject).toHaveBeenCalledExactlyOnceWith(props.objects[0]);
  });

  it("preserves annotation tools, actions, selection and broken-link status", () => {
    click(tab("Mapa"));
    click(button("Pin de habitacion"));
    click(button("Area de informacion"));
    click(button("Conexion de escena"));
    expect(props.onStartRoomPin).toHaveBeenCalledOnce();
    expect(props.onStartInformationArea).toHaveBeenCalledOnce();
    expect(props.onStartSceneLink).toHaveBeenCalledOnce();
    expect(button("Area de informacion").classList.contains("is-active")).toBe(true);
    const pin = [...container.querySelectorAll<HTMLButtonElement>(".annotation-tree__leaf-main")]
      .find((item) => item.textContent?.includes("Sala"))!;
    click(pin);
    click(query('[aria-label="Ir a Sala"]'));
    click(query('[aria-label="Editar Sala"]'));
    click(query('[aria-label="Bloquear Sala"]'));
    click(query('[aria-label="Mostrar Foso al jugador durante 5 segundos"]'));
    click(query('[aria-label="Eliminar Foso"]'));
    expect(props.onSelectAnnotation).toHaveBeenCalledExactlyOnceWith(props.annotations.pins[0]);
    expect(props.onGoToAnnotation).toHaveBeenCalledExactlyOnceWith(props.annotations.pins[0]);
    expect(props.onEditAnnotation).toHaveBeenCalledExactlyOnceWith(props.annotations.pins[0]);
    expect(props.onToggleAnnotationLock).toHaveBeenCalledExactlyOnceWith(props.annotations.pins[0]);
    expect(props.onHighlightInformationArea).toHaveBeenCalledExactlyOnceWith("area");
    expect(props.onDeleteInformationArea).toHaveBeenCalledExactlyOnceWith("area");
    expect(query(".annotation-tree__leaf.is-broken").textContent).toContain("Salida");
    render({ selectedElementId: "pin" });
    expect(pin.closest('[role="treeitem"]')?.getAttribute("aria-selected")).toBe("true");
    render({ selectedElementId: "link" });
    const broken = query(".annotation-tree__leaf.is-broken");
    expect(broken.getAttribute("aria-selected")).toBe("true");
    expect(getComputedStyle(broken).borderLeftColor).toBe("rgb(217, 122, 108)");
  });

  it("preserves entity CRUD, visibility and templates without losing other scene collections", () => {
    const monsters = vi.mocked(MonsterSection).mock.lastCall![0];
    const npcs = vi.mocked(NpcSection).mock.lastCall![0];
    const characters = vi.mocked(PlayerCharacterSection).mock.lastCall![0];
    expect(monsters.templates).toBe(props.monsterTemplates);
    expect(monsters.monsters).toBe(aside.monsters);
    expect(npcs.npcs).toBe(aside.npcs);
    expect(characters.characters).toBe(aside.playerCharacters);
    for (const [collection, handlers, entity] of [
      ["monsters", monsters, aside.monsters[0]], ["npcs", npcs, aside.npcs[0]]
    ] as const) {
      const added = { ...entity, id: "new" }, updated = { ...entity, notes: "Editado" };
      handlers.onAdd(added);
      expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, [collection]: [entity, added] });
      handlers.onUpdate(updated);
      expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, [collection]: [updated] });
      handlers.onToggleVisibility(entity.id);
      expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, [collection]: [{ ...entity, visibleToPlayer: !entity.visibleToPlayer }] });
      handlers.onRemove(entity.id);
      expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, [collection]: [] });
    }
    const added = { ...aside.playerCharacters[0], id: "new-pc" }, updated = { ...aside.playerCharacters[0], notes: "Editado" };
    characters.onAdd(added);
    expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, playerCharacters: [...aside.playerCharacters, added] });
    characters.onUpdate(updated);
    expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, playerCharacters: [updated] });
    characters.onRemove(updated.id);
    expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, playerCharacters: [] });
  });

  it("preserves hierarchical note CRUD and uses the latest scene data after a tab switch", () => {
    const added = { id: "second-child", parentId: "note", name: "Otra pista", content: "Puerta" };
    const notes = vi.mocked(NotesSection).mock.lastCall![0];
    expect(notes.notes).toBe(aside.notes);
    notes.onAdd(added);
    expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, notes: [...aside.notes, added] });
    notes.onUpdate({ ...aside.notes[1], content: "Actualizada" });
    expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, notes: [aside.notes[0], { ...aside.notes[1], content: "Actualizada" }] });
    notes.onRemove("note");
    expect(props.onChange).toHaveBeenLastCalledWith({ ...aside, notes: [] });
    click(tab("Mapa"));
    const latest = { ...aside, notes: [...aside.notes, added] };
    render({ aside: latest });
    click(tab("Escena"));
    vi.mocked(NotesSection).mock.lastCall![0].onRemove("child");
    expect(props.onChange).toHaveBeenLastCalledWith({ ...latest, notes: [aside.notes[0], added] });
  });

  it("scopes every style to the explorer without owning panel width or placement", () => {
    const rules = [...style.sheet!.cssRules] as CSSStyleRule[];
    for (const rule of rules) {
      for (const selector of rule.selectorText.split(",")) {
        expect(selector.trim().startsWith(".vtt-interface .dm-aside-panel")).toBe(true);
      }
    }
    const panelRule = rules.find((rule) => rule.selectorText === ".vtt-interface .dm-aside-panel")!;
    for (const property of ["width", "min-width", "max-width", "position", "inset", "left", "right", "top", "bottom"]) {
      expect(panelRule.style.getPropertyValue(property)).toBe("");
    }
  });
});
