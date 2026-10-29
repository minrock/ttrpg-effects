import type { ScreenPoint } from "../../../domain/shared/coordinates";

/** Bounded, opt-in DOM diagnostics. Never renders, binds buffers, or changes GL state. */
export function startCanvasVerification(host: HTMLElement, extraPoints: readonly ScreenPoint[] = [], watchDiceFrames = false): () => void {
  if (new URLSearchParams(window.location.search).get("verify") !== "1") return () => {};

  const data = host.dataset;
  data.verifyState = "sampling";
  data.verifyFrames = "0";
  data.verifyNonzero = "0";
  data.verifyNonblank = "false";
  data.verifyChanging = "false";
  data.verifyColors = "[]";
  data.verifyChecksums = "[]";
  delete data.verifyReason;

  let frameId = 0;
  let deadline = 0;
  let observer: MutationObserver | null = null;
  let finished = false;
  const finish = (state: string, reason?: string): void => {
    if (finished) return;
    finished = true;
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(deadline);
    observer?.disconnect();
    data.verifyState = state;
    if (reason) data.verifyReason = reason;
  };
  const cancel = (): void => finish("cancelled");
  const canvas = host.querySelector("canvas");
  if (canvas === null) {
    finish("unavailable", "missing-canvas");
    return cancel;
  }

  try {
    // Pixi already owns this canvas; these calls retrieve its context, with no options.
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (gl === null) {
      finish("unavailable", "not-webgl");
      return cancel;
    }
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const bounds = canvas.getBoundingClientRect();
    if (width < 8 || height < 8 || bounds.width <= 0 || bounds.height <= 0) {
      finish("unavailable", "empty-canvas");
      return cancel;
    }
    data.verifySize = `${width}x${height}`;
    const fractions = watchDiceFrames ? Array.from({ length: 10 }, (_, i) => (i + .5) / 10) : [0.2, 0.5, 0.8];
    const points = fractions.flatMap(y => fractions.map(x => ({ x: x * bounds.width, y: y * bounds.height })));
    points.push(...extraPoints.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)
      && point.x >= 0 && point.x < bounds.width && point.y >= 0 && point.y < bounds.height).slice(0, 3));
    const patches = points.map(point => ({
      x: Math.max(0, Math.min(width - 8, Math.floor(point.x / bounds.width * width) - 4)),
      y: Math.max(0, Math.min(height - 8, Math.floor((1 - point.y / bounds.height) * height) - 4))
    }));
    data.verifyPoints = JSON.stringify(patches);
    const pixels = new Uint8Array(8 * 8 * 4);
    const checksums: string[] = [];
    let attempts = 0;
    let maxNonzero = 0;
    let nonblank = false;

    const sample = (): void => {
      if (finished) return;
      try {
        if (!host.isConnected || !host.contains(canvas)) return finish("cancelled", "detached-canvas");
        if (gl.isContextLost()) return finish("unavailable", "context-lost");
        if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) return finish("cancelled", "canvas-resized");
        attempts++;
        // Pixi's already-running RAF is queued first. Read in the same frame, before
        // compositing discards its non-preserved buffer, and only from the screen.
        if (attempts % 4 === 0 && gl.getParameter(gl.FRAMEBUFFER_BINDING) === null) {
          let checksum = 2166136261;
          let nonzero = 0;
          const colors = new Set<string>();
          for (const patch of patches) {
            pixels.fill(0);
            gl.readPixels(patch.x, patch.y, 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            for (let i = 0; i < pixels.length; i += 4) {
              const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
              if (r || g || b) nonzero++;
              if (colors.size < 16) colors.add(`#${[r, g, b].map(channel => channel.toString(16).padStart(2, "0")).join("")}`);
              for (let channel = 0; channel < 4; channel++) checksum = Math.imul(checksum ^ pixels[i + channel], 16777619);
            }
          }
          checksums.push((checksum >>> 0).toString(16).padStart(8, "0"));
          maxNonzero = Math.max(maxNonzero, nonzero);
          nonblank ||= nonzero > 0 && colors.size > 1;
          data.verifyFrames = String(checksums.length);
          data.verifyNonzero = String(maxNonzero);
          data.verifyNonblank = String(nonblank);
          data.verifyColors = JSON.stringify([...colors]);
          data.verifyChecksums = JSON.stringify(checksums);
          data.verifyChanging = String(new Set(checksums).size > 1);
          if (checksums.length >= 6 && nonblank) return finish("complete");
        }
        if (attempts >= 60) return finish("unavailable", "screen-buffer-not-ready");
        if (!watchDiceFrames) frameId = window.requestAnimationFrame(sample);
      } catch (error) {
        finish("error", error instanceof Error ? error.message : String(error));
      }
    };
    deadline = window.setTimeout(() => finish("unavailable", "sampling-timeout"), 3000);
    if (watchDiceFrames) {
      // The existing dice renderer updates this DOM attribute immediately after drawing.
      // Observe that signal before compositing clears its transparent screen buffer.
      observer = new MutationObserver(sample);
      observer.observe(host, { attributes: true, attributeFilter: ["data-motion"] });
    } else frameId = window.requestAnimationFrame(sample);
  } catch (error) {
    finish("error", error instanceof Error ? error.message : String(error));
  }
  return cancel;
}
