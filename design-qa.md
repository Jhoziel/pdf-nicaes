# Design QA — Jerarquía de operación PCL sobre producción NicaES

## Comparison target

- Source visual truth: `C:\Users\camil\Projects\pdf-nicaes\audit-output\product-design\00-selected-option-2-reference.png`
- Production visual constraint: dark NicaES interface supplied by the user in the current conversation.
- Browser-rendered implementation: `C:\Users\camil\Projects\pdf-nicaes\audit-output\product-design\03-production-option-2-dark.png`
- Responsive evidence: `C:\Users\camil\Projects\pdf-nicaes\audit-output\product-design\04-production-option-2-mobile.png`
- Reference pixels: 1589 × 990.
- Desktop implementation pixels/CSS viewport: 2560 × 1305 at device pixel ratio 1.
- Mobile implementation pixels/CSS viewport: 375 × 812 at device pixel ratio 1.
- State: Spanish, dark theme, “Generar paquetes por PCL” selected, no files loaded.
- Normalization: the selected concept and implementation were opened together in one visual comparison. Exact geometric overlay was intentionally not used because the user replaced the concept's light shell with the narrower dark production shell; the comparison therefore treats production layout, logo, typography, and theme as fixed constraints and compares the operation hierarchy and selected PCL state within that shell.

## Full-view comparison evidence

The implementation preserves the production NicaES shell (real logo asset, IBM Plex Sans, dark navy canvas, blue controls, compact 1220 px workspace) while carrying over the selected concept's defining hierarchy: step 2 becomes current after choosing PCL, the operation card receives a strong header, the selected option gains a left accent and explicit result line, and the required PCL uploader becomes visible with a distinct secondary accent.

The mobile capture confirms that the file and PCL upload regions stack before the operation card, the selected mode remains legible, and no primary content overflows horizontally.

## Focused region comparison evidence

A separate crop was not required: both original captures retain legible text in the two fidelity-critical regions—the right operation card and the left PCL upload row—when opened at original resolution. These regions were also inspected interactively in the browser after selecting PCL.

## Findings and comparison history

### Pass 1 — findings

- [P1] The implementation base did not match production.
  - Evidence: local code used the older light identity while production used the NicaES logo, theme selector, and dark navy system.
  - Fix: rebased both PCL commits onto `origin/main` and resolved the visual/deployment conflicts in favor of the production system while preserving PCL behavior.
- [P1] Operation choice lacked hierarchy.
  - Evidence: the original production card gave its title, options, and surrounding upload panel nearly equal visual weight.
  - Fix: added a high-contrast “Paso 2 · Operación” header, stronger card boundary, selected-state elevation, and one explicit outcome per mode.
- [P2] Selecting PCL did not clearly advance the workflow.
  - Evidence: the files step remained visually current even after the user chose the PCL operation.
  - Fix: a deliberate mode choice now makes step 2 current; loading files still marks step 1 complete and results remain step 3.
- [P2] The PCL upload requirement blended into the PDF card.
  - Evidence: it used the same neutral surface as the primary upload.
  - Fix: added a restrained violet semantic accent, tinted surface, matching PCL badge, and button border in both themes.
- [P2] Local visual verification displayed a broken NicaES logo.
  - Evidence: the local PowerShell server did not serve `assets/nicaes-logo-white.png`.
  - Fix: added the curated logo asset to the server allowlist.

### Pass 2 — post-fix evidence

- Desktop dark and light captures show the real logo, production tokens, step 2 current, PCL uploader visible, and PCL selected with “Resultado: un ZIP por edificio.”
- Mobile capture shows a single-column layout with readable upload controls and operation choices.
- Spanish/English switching updates the header and outcome copy correctly.
- Browser console: no errors or warnings in the app or clean unit-test tabs.
- Automated browser suite: 13/13 checks passed, including 5 PCL domain tests, 2 streaming ZIP tests, input locking, the complete individual/master ZIP flow, and regressions for MiTek footer warnings, exact TRUSS matching in primary and fallback detection, and unidentified pages.
- Post-rebase end-to-end browser check: Chrome loaded one PDF and `archivo-pcl.PCL`, generated the report-only package for 84 missing TRUSS entries, exposed the detailed report, enabled both individual and master ZIP downloads, and kept the interface free of console errors.

## Required fidelity surfaces

- Fonts and typography: IBM Plex Sans and the production weights, sizes, tracking, and hierarchy are preserved; the new header and outcomes reuse the same family and optical scale.
- Spacing and layout rhythm: production grid, card radii, panel spacing, sticky desktop operation card, and mobile stacking remain intact. The header/body split adds hierarchy without changing the workspace footprint.
- Colors and visual tokens: all new states use theme variables. The operation header follows NicaES blue; the PCL accent has explicit light/dark tokens and adequate foreground separation.
- Image quality and asset fidelity: the supplied raster NicaES logo is used directly and renders sharply. No visible brand asset was recreated in CSS or substituted.
- Copy and content: selected-option outcomes are concise, accurate, and translated in Spanish and English. PCL copy continues to promise one ZIP per building with one PDF per TRUSS and its report.

## Follow-up polish

- No remaining P3 items from this pass.

final result: passed
