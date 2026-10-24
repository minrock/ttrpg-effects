# Dice geometry and face textures

Vendored from @3d-dice/dice-box-threejs 0.0.12, commit
`6945e0068eae27f22acd26debdb70f6ef2fd6063`:
https://github.com/3d-dice/dice-box-threejs

MIT license retained in LICENSE. Only DiceFactory, DicePreset and their constant
tables are used. The upstream browser orchestrator and bundled copies of Three
and Cannon are not included. Local changes: explicit .js import extensions;
TypeScript declaration at the adapter boundary; trailing whitespace normalized. All app orchestration lives
outside this directory. Number textures are generated locally, without network.
