import { useTtrpgApi } from "../client/ClientProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultDiceSizes, type DiceSizeChange, type DiceSizes } from "../../../domain/dice/size";

export function useDiceSizes() {
  const diceApi = useTtrpgApi("dice");
  const [sizes, setSizes] = useState(defaultDiceSizes), [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(false);
  const clientGeneration = useRef(0);
  const accept = useCallback((value: DiceSizes) => setSizes(current => value.revision >= current.revision ? value : current), []);
  useEffect(() => {
    alive.current = true;
    clientGeneration.current++;
    setSizes(defaultDiceSizes()); setReady(false); setError(null);
    const api = diceApi;
    if (!api?.getDiceSizes || !api.onDiceSizes) return () => { alive.current = false; };
    let cancelled = false;
    const off = api.onDiceSizes(value => { if (!cancelled) accept(value); });
    void api.getDiceSizes().then(reply => {
      if (cancelled) return;
      if (!reply.ok) throw new Error(reply.error);
      accept(reply.value); setReady(true);
    }).catch(() => { if (!cancelled) setError("No se pudo cargar el tamano de los dados."); });
    return () => { cancelled = true; alive.current = false; off(); };
  }, [accept, diceApi]);
  const setSize = async (change: DiceSizeChange): Promise<void> => {
    if (!ready || !diceApi?.setDiceSize) return;
    const generation = clientGeneration.current;
    try {
      const reply = await diceApi.setDiceSize(change);
      if (!alive.current || generation !== clientGeneration.current) return;
      if (!reply.ok) throw new Error(reply.error);
      accept(reply.value); setError(null);
    } catch (caught) { if (alive.current && generation === clientGeneration.current) setError(caught instanceof Error ? caught.message : "No se pudo cambiar el tamano."); }
  };
  return { sizes, ready, error, setSize };
}
