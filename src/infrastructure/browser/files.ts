/** Selector con consentimiento del navegador; nunca inspecciona rutas del host. */
export function selectBrowserFile(accept: string, signal?: AbortSignal): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input"); input.type = "file"; input.accept = accept; input.hidden = true;
    const finish = (file: File | null) => { input.removeEventListener("change", change); input.removeEventListener("cancel", cancel); signal?.removeEventListener("abort", cancel); input.remove(); resolve(file); };
    const change = () => finish(input.files?.[0] ?? null);
    const cancel = () => finish(null);
    input.addEventListener("change", change); input.addEventListener("cancel", cancel); signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    document.body.append(input); input.click();
  });
}
export function downloadScene(json: string, name: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = `${name.replace(/[^\p{L}\p{N} _-]/gu, "_").slice(0, 100) || "escena"}.ttrpgscene`;
  document.body.append(link); link.click(); link.remove();
  // El navegador necesita consumir la URL antes de revocarla.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
