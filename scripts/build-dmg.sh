#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Typecheck..."
pnpm typecheck

echo "==> Compile (electron-vite)..."
pnpm exec electron-vite build

echo "==> Package DMG (electron-builder)..."
pnpm exec electron-builder --mac dmg

# Remove quarantine so macOS Gatekeeper doesn't block the app on first launch.
# This is safe for personal/internal builds not distributed through the App Store.
DMG=$(ls dist/*.dmg 2>/dev/null | head -1)
if [[ -n "$DMG" ]]; then
  echo "==> Removing quarantine from DMG..."
  xattr -d com.apple.quarantine "$DMG" 2>/dev/null || true
fi

echo ""
echo "DMG generado en: $ROOT/dist/"
ls -lh dist/*.dmg 2>/dev/null || true
echo ""
echo "Para instalar: abre el DMG y arrastra la app a /Applications."
echo "Si macOS bloquea la app, haz clic derecho → Abrir la primera vez."
