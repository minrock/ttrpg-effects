export type SceneCounterMode = "progress" | "countdown";
export type SceneCounterKind = "fixed" | "dynamic";

export interface SceneCounter {
  readonly id: string;
  readonly label: string;
  readonly mode: SceneCounterMode;
  readonly kind: SceneCounterKind;
  readonly value: number;
  readonly capacity?: number;
  readonly isVisibleToPlayers: boolean;
  readonly isLabelVisibleToPlayers: boolean;
}

export interface CreateSceneCounterInput {
  readonly id: string;
  readonly label: string;
  readonly mode: SceneCounterMode;
  readonly kind: SceneCounterKind;
  readonly capacity?: number;
  readonly initialValue?: number;
  readonly isVisibleToPlayers?: boolean;
  readonly isLabelVisibleToPlayers?: boolean;
}

export interface UpdateSceneCounterInput {
  readonly label: string;
  readonly mode: SceneCounterMode;
  readonly kind: SceneCounterKind;
  readonly capacity?: number;
  readonly value: number;
  readonly isVisibleToPlayers: boolean;
  readonly isLabelVisibleToPlayers: boolean;
}

export class SceneCounterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneCounterError";
  }
}

export function createDefaultSceneCounters(): readonly SceneCounter[] {
  return [];
}

export function createSceneCounter(input: CreateSceneCounterInput): SceneCounter {
  const capacity = normalizeCapacity(input.kind, input.capacity);
  const value = input.initialValue ?? (input.mode === "countdown" && capacity !== undefined ? capacity : 0);
  return normalizeCounter({
    id: input.id,
    label: input.label,
    mode: input.mode,
    kind: input.kind,
    value,
    capacity,
    isVisibleToPlayers: input.isVisibleToPlayers ?? false,
    isLabelVisibleToPlayers: input.isLabelVisibleToPlayers ?? false
  });
}

export function updateSceneCounter(
  counters: readonly SceneCounter[],
  id: string,
  input: UpdateSceneCounterInput
): readonly SceneCounter[] {
  assertKnownCounter(counters, id);
  return counters.map((counter) =>
    counter.id === id
      ? normalizeCounter({ id, ...input })
      : counter
  );
}

export function adjustSceneCounter(
  counters: readonly SceneCounter[],
  id: string,
  delta: number
): readonly SceneCounter[] {
  if (!Number.isInteger(delta)) {
    throw new SceneCounterError("El ajuste del contador debe ser un entero.");
  }
  const counter = assertKnownCounter(counters, id);
  return updateSceneCounter(counters, id, { ...counter, value: Math.max(0, counter.value + delta) });
}

export function removeSceneCounter(counters: readonly SceneCounter[], id: string): readonly SceneCounter[] {
  assertKnownCounter(counters, id);
  return counters.filter((counter) => counter.id !== id);
}

export function getPlayerVisibleSceneCounters(counters: readonly SceneCounter[]): readonly SceneCounter[] {
  return counters.filter((counter) => counter.isVisibleToPlayers);
}

export function getSceneCounterVisualProgress(counter: SceneCounter): number {
  if (counter.kind === "fixed") {
    return counter.capacity === undefined ? 0 : counter.value / counter.capacity;
  }

  if (counter.value === 0) return 0;
  const magnitude = Math.pow(10, Math.ceil(Math.log10(counter.value + 1)));
  return Math.min(counter.value / magnitude, 1);
}

export function assertSceneCounters(counters: readonly SceneCounter[]): void {
  const ids = new Set<string>();
  for (const counter of counters) {
    if (ids.has(counter.id)) {
      throw new SceneCounterError("Los contadores deben tener IDs unicos.");
    }
    ids.add(counter.id);
    normalizeCounter(counter);
  }
}

function normalizeCounter(counter: SceneCounter): SceneCounter {
  const id = counter.id.trim();
  if (id === "") throw new SceneCounterError("El contador necesita un ID.");

  const label = counter.label.trim();
  if (label === "") throw new SceneCounterError("El contador necesita una etiqueta.");
  if (label.length > 120) throw new SceneCounterError("La etiqueta del contador no puede superar 120 caracteres.");
  if (counter.mode !== "progress" && counter.mode !== "countdown") {
    throw new SceneCounterError("El modo del contador no es valido.");
  }
  if (counter.kind !== "fixed" && counter.kind !== "dynamic") {
    throw new SceneCounterError("El tipo del contador no es valido.");
  }
  if (!Number.isInteger(counter.value) || counter.value < 0) {
    throw new SceneCounterError("El valor del contador debe ser un entero igual o mayor a cero.");
  }

  const capacity = normalizeCapacity(counter.kind, counter.capacity);
  return {
    id,
    label,
    mode: counter.mode,
    kind: counter.kind,
    value: capacity === undefined ? counter.value : Math.min(counter.value, capacity),
    ...(capacity === undefined ? {} : { capacity }),
    isVisibleToPlayers: Boolean(counter.isVisibleToPlayers),
    isLabelVisibleToPlayers: Boolean(counter.isLabelVisibleToPlayers)
  };
}

function normalizeCapacity(kind: SceneCounterKind, capacity: number | undefined): number | undefined {
  if (kind === "dynamic") return undefined;
  if (!Number.isInteger(capacity) || capacity === undefined || capacity < 1) {
    throw new SceneCounterError("Un contador con espacios necesita una capacidad entera mayor a cero.");
  }
  return capacity;
}

function assertKnownCounter(counters: readonly SceneCounter[], id: string): SceneCounter {
  const counter = counters.find((candidate) => candidate.id === id);
  if (counter === undefined) throw new SceneCounterError("No se encontro el contador solicitado.");
  return counter;
}
