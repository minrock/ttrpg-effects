export function addRecentPath(
  paths: readonly string[],
  filePath: string,
  maxItems = 5
): readonly string[] {
  const normalized = filePath.trim();

  if (normalized.length === 0 || maxItems <= 0) {
    return paths.slice(0, Math.max(0, maxItems));
  }

  return [
    normalized,
    ...paths.filter((candidate) => candidate !== normalized)
  ].slice(0, maxItems);
}

export function removeRecentPath(paths: readonly string[], filePath: string): readonly string[] {
  return paths.filter((candidate) => candidate !== filePath);
}
