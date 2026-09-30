# Third-party browser assets

The production build serves these pinned files from the same origin. Runtime code must not replace these paths with CDN URLs.

| Component | Version | Source | License |
| --- | --- | --- | --- |
| PDF.js (`pdfjs-dist`) | 3.11.174 | `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/` | Apache-2.0; see `licenses/pdfjs-3.11.174-LICENSE.txt` |
| pdf-lib | 1.17.1 | `https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/` | MIT; see `licenses/pdf-lib-1.17.1-LICENSE.md` |
| JSZip | 3.10.1 | `https://cdn.jsdelivr.net/npm/jszip@3.10.1/` | MIT or GPL-3.0; see `licenses/jszip-3.10.1-LICENSE.markdown` |
| Tesseract.js | 5.1.0 | `https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/` | Apache-2.0; see `licenses/tesseract.js-5.1.0-LICENSE.md` |
| tesseract.js-core | 5.1.0 | `https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/` | Apache-2.0; see `licenses/tesseract.js-core-5.1.0-LICENSE.txt` |
| English tessdata | 4.0.0 | `https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/eng.traineddata.gz` | Apache-2.0; see `licenses/tessdata-4.0.0-LICENSE.txt` |
| IBM Plex Sans | 1.1.0 | `https://cdn.jsdelivr.net/npm/@ibm/plex-sans@1.1.0/` | SIL OFL-1.1; see `licenses/ibm-plex-sans-1.1.0-LICENSE.txt` |

`manifest.sha256` records the exact bytes accepted by the build. Update the versioned directory, notice, and manifest together when upgrading a dependency.
