import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

const html = readFileSync(new URL("./dashboard.html", import.meta.url), "utf8");
const ventanas: JSDOM[] = [];
const trabajo = {
  id: "001-notas",
  titulo: "Notas del mapa",
  rama: "feature/factory-001-notas",
  etapa: "revision",
  ciclo: 1,
  ronda: 1,
  rondas: [{ numero: 1, ciclo: 1, revisiones: { seguridad: "APROBADO", ux: "CAMBIOS", ui: "pendiente", codigo: "APROBADO" } }]
};
const tablero = (trabajos: unknown[] = [trabajo]) => ({ version: 1, actualizado: null, trabajos });
const respuesta = (datos: unknown, status = 200) => ({ ok: status === 200, status, json: async () => datos, text: async () => String(datos) });

async function montar(fetch: ReturnType<typeof vi.fn>, query = "") {
  const dom = new JSDOM(html, {
    url: `http://127.0.0.1:8765/dashboard.html${query}`,
    runScripts: "dangerously",
    beforeParse(window) {
      window.fetch = fetch;
      // jsdom no implementa diálogos modales; la comprobación visual usa el navegador.
      window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
      window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new window.Event("close")); };
    }
  });
  ventanas.push(dom);
  await vi.waitFor(() => expect(dom.window.document.getElementById("conexion")?.textContent).not.toContain("Conectando"));
  return dom.window.document;
}

function pulsar(document: Document, selector: string) {
  const boton = document.querySelector<HTMLButtonElement>(selector);
  expect(boton).not.toBeNull();
  boton!.click();
}

afterEach(() => { for (const ventana of ventanas.splice(0)) ventana.window.close(); });

describe("tablero de la fábrica", () => {
  it("muestra etapas, veredictos y un expediente con Markdown inerte", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(respuesta(tablero())).mockResolvedValue(respuesta("# Informe\n<script>window.comprometido = true</script>\n<img src=x onerror=alert(1)>"));
    const document = await montar(fetch);
    expect(document.querySelectorAll(".columna")).toHaveLength(7);
    expect(document.querySelector('[data-etapa="revision"] .titulo')?.textContent).toBe("Notas del mapa");
    expect(document.querySelectorAll(".chip.aprobado")).toHaveLength(2);
    expect(document.querySelectorAll(".chip.cambios")).toHaveLength(1);
    pulsar(document, ".tarjeta");
    await vi.waitFor(() => expect(document.getElementById("contenido")?.textContent).toContain("<script>"));
    expect(document.querySelector("#contenido script, #contenido img")).toBeNull();
    expect(document.querySelectorAll("#archivos button")).toHaveLength(9);
    expect(fetch.mock.calls[1][0]).toBe("jobs/001-notas/spec.md");
    pulsar(document, "#cerrar");
    expect(document.getElementById("detalle")?.hasAttribute("open")).toBe(false);
  });

  it("conserva la última lectura ante JSON inválido y recupera el estado", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(respuesta(tablero())).mockResolvedValueOnce(respuesta({ version: 2 })).mockResolvedValue(respuesta(tablero([{ ...trabajo, etapa: "necesita-persona", motivo: "Falta autorización" }])));
    const document = await montar(fetch);
    pulsar(document, "#actualizar");
    await vi.waitFor(() => expect(document.getElementById("conexion")?.className).toBe("error"));
    expect(document.querySelectorAll(".tarjeta")).toHaveLength(1);
    pulsar(document, "#actualizar");
    await vi.waitFor(() => expect(document.querySelector(".tarjeta.atencion")).not.toBeNull());
    expect(document.getElementById("conexion")?.className).toBe("");
  });

  it("rechaza rutas y rondas malformadas antes de crear tarjetas", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(respuesta(tablero([{ ...trabajo, id: "../privado" }]))).mockResolvedValue(respuesta(tablero([{ ...trabajo, rondas: [{ numero: 1, ciclo: 1, revisiones: { seguridad: "APROBADO" } }] }])));
    const document = await montar(fetch);
    expect(document.querySelectorAll(".tarjeta")).toHaveLength(0);
    expect(document.getElementById("conexion")?.className).toBe("error");
    pulsar(document, "#actualizar");
    await vi.waitFor(() => expect(document.getElementById("conexion")?.textContent).toContain("ronda"));
    expect(document.querySelectorAll(".tarjeta")).toHaveLength(0);
    expect(fetch.mock.calls.every(([ruta]) => ruta === "board.json")).toBe(true);
  });

  it("ignora documentos atrasados al cambiar la selección", async () => {
    let terminarSpec: (valor: ReturnType<typeof respuesta>) => void = () => {};
    const fetch = vi.fn().mockResolvedValueOnce(respuesta(tablero())).mockImplementationOnce(() => new Promise((resolve) => { terminarSpec = resolve; })).mockResolvedValue(respuesta("# Construcción vigente"));
    const document = await montar(fetch);
    pulsar(document, ".tarjeta");
    pulsar(document, '[data-archivo="build.md"]');
    await vi.waitFor(() => expect(document.getElementById("contenido")?.textContent).toBe("# Construcción vigente"));
    terminarSpec(respuesta("# Spec atrasada"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.getElementById("contenido")?.textContent).toBe("# Construcción vigente");
  });

  it("explica informes pendientes y mantiene vacía una cola sin trabajos", async () => {
    const vacio = await montar(vi.fn().mockResolvedValue(respuesta(tablero([]))));
    expect(vacio.getElementById("vacio")?.hidden).toBe(false);
    const document = await montar(vi.fn().mockResolvedValueOnce(respuesta(tablero())).mockResolvedValue(respuesta("", 404)));
    pulsar(document, ".tarjeta");
    await vi.waitFor(() => expect(document.getElementById("contenido")?.textContent).toContain("aún no disponible"));
  });

  it("consulta de nuevo automáticamente y mueve la tarjeta sin intervención", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(respuesta(tablero())).mockResolvedValue(respuesta(tablero([{ ...trabajo, etapa: "aprobacion" }])));
    const document = await montar(fetch);
    await vi.waitFor(() => expect(document.querySelector('[data-etapa="aprobacion"] .tarjeta')).not.toBeNull(), { timeout: 3500 });
    expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("el ejemplo permite recorrer rondas sin leer o escribir el tablero real", async () => {
    const fetch = vi.fn();
    const document = await montar(fetch, "?demo");
    expect(document.getElementById("aviso-demo")?.hidden).toBe(false);
    expect(document.querySelectorAll(".tarjeta")).toHaveLength(4);
    pulsar(document, '[data-trabajo="002-notas-mapa"]');
    pulsar(document, '[data-archivo="ronda-1/revision-ux.md"]');
    expect(document.getElementById("contenido")?.textContent).toContain("VEREDICTO: CAMBIOS");
    pulsar(document, '[data-archivo="ronda-2/revision-ui.md"]');
    expect(document.getElementById("contenido")?.textContent).toContain("pendiente");
    expect(fetch).not.toHaveBeenCalled();
  });
});
