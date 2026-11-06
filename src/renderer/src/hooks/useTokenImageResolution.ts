import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { SceneToken } from "../../../domain/sessions/scene-document";
import type { TtrpgApi } from "../../../shared/api/ttrpg-api";

type ImageUrls = Readonly<Record<string, string>>;
interface Options {
  tokens: readonly SceneToken[];
  urls: ImageUrls;
  api: Pick<TtrpgApi, "resolveTokenUrl"> | undefined;
  scope: string;
  active: boolean;
  setUrls: Dispatch<SetStateAction<ImageUrls>>;
  onUnavailable: () => void;
}

/** Resolver solo cambios de referencias, no movimientos ni renders del editor. */
export function useTokenImageResolution(options: Options): void {
  const { api, scope, active, setUrls } = options;
  const latest = useRef(options);
  latest.current = options;
  const failed = useRef(new Map<string, string>());
  const missing = options.tokens.filter(token => options.urls[token.id] === undefined);
  const requestKey = JSON.stringify(missing.map(token => [token.id, token.imagePath]));

  useEffect(() => { failed.current.clear(); }, [api, scope, active]);
  useEffect(() => {
    if (!api || !active) return;
    const current = latest.current;
    const paths = new Map(current.tokens.map(token => [token.id, token.imagePath]));
    for (const [id, path] of failed.current) if (paths.get(id) !== path) failed.current.delete(id);
    const candidates = current.tokens.filter(token => current.urls[token.id] === undefined && failed.current.get(token.id) !== token.imagePath);
    if (!candidates.length) return;
    let cancelled = false;
    void Promise.all(candidates.map(async token => {
      try { return { id: token.id, path: token.imagePath, url: await api.resolveTokenUrl(token.imagePath) }; }
      catch { return { id: token.id, path: token.imagePath, url: null }; }
    })).then(entries => {
      if (cancelled) return;
      for (const entry of entries) if (entry.url === null) failed.current.set(entry.id, entry.path);
      setUrls(current => {
        let next: Record<string, string> | null = null;
        for (const entry of entries) {
          if (entry.url === null || current[entry.id] !== undefined) continue;
          if (!latest.current.tokens.some(token => token.id === entry.id && token.imagePath === entry.path)) continue;
          next ??= { ...current };
          next[entry.id] = entry.url;
        }
        // Un recurso ausente no debe producir otro render y otra petición.
        return next ?? current;
      });
      if (entries.some(entry => entry.url === null)) latest.current.onUnavailable();
    });
    return () => { cancelled = true; };
  }, [requestKey, api, scope, active, setUrls]);
}
