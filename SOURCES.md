# Sources

Workbench Toolbox is a shell around six free, open source tools by TheMakersWorkbench.com. The tool code is copied unchanged
(see the patch list below) so everything runs offline. Each tool keeps its own `LICENSE`, `NOTICE` and `SOURCES.md`
(the formulas and data sources behind its calculations) in its folder.

| Upstream repository (github.com/MakersWorkbench) | Folder here | Commit vendored |
| --- | --- | --- |
| `component-marking-decoder` | `www/tools/decoder/` | `951cb85eaa2f` |
| `circuit-calculators` | `www/tools/calculators/` | `842f1c2739b7` |
| `embedded-toolkit` | `www/tools/embedded/` | `13f2d66afa3e` |
| `power-battery` | `www/tools/power/` | `ad0252b02d1f` |
| `pcb-wiring` | `www/tools/pcb/` | `01af4188db75` |
| `bench-tools` | `www/tools/bench/` | `e8b5a072e708` |

Run `npm run sync` to pull the latest versions. The exact commits are recorded in `www/tools/sources.lock.json`.

## Changes made to the vendored copies

`scripts/sync-tools.mjs` applies these small text patches after every sync (and tells you if upstream already fixed one):

1. `circuit-calculators`: the on-screen name is "Electronics Calculators" (upstream still says "Circuit Calculators").
2. `pcb-wiring`: the tagline is "Calculators for PCB traces, vias, spacing, and wire gauge".

No calculation logic is changed. The `node --test` suites from each tool are copied to `tests/tools/` and run against the vendored logic.

## Shell-level styling (not edits to the tools)

* `www/tools-fixes.css` lets tab buttons wrap on phones and makes every control at least 44 px tall.
* `www/theme-light.css` adds a light theme by re-mapping the tools' color variables.

Both are scoped under each tool's own root class.

## Not included

The Microcontroller Lab (Velxio) and the Pinout Finder are intentionally left out of this app.
