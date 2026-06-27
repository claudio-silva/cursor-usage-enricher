# Cursor Usage Enricher

Chrome extension that adds three columns to the Cursor web **Usage** dashboard table:

| Column | Source |
| --- | --- |
| **Uncached** | `tokenUsage.inputTokens + tokenUsage.outputTokens` |
| **Cost** | `chargedCents / 100` (actual charged) |
| **Cost (nominal)** | `tokenUsage.totalCents / 100` (full/notional price) |

Columns are inserted immediately after the native **Tokens** column.

## How it works

1. **`interceptor.js`** (MAIN world, `document_start`) patches `fetch` and `XMLHttpRequest` on `cursor.com/dashboard*`. When the page calls `POST /api/dashboard/get-filtered-usage-events`, the response JSON is forwarded via `window.postMessage`.
2. **`content.js`** (isolated world) listens for those messages, caches `usageEventsDisplay`, and injects header/body cells by cloning the existing Tokens column cells (matching width and alignment). A `MutationObserver` re-applies enrichment when React redraws the table.

## Install (load unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder (`cursor-chrome-extension`)
5. Open [cursor.com/dashboard/usage](https://cursor.com/dashboard/usage) and reload the page

Requires Chrome **111+** (Manifest V3 `world: "MAIN"` content scripts).

## Files

| File | Role |
| --- | --- |
| `manifest.json` | Extension manifest |
| `interceptor.js` | Network interception bridge |
| `content.js` | Table enrichment + observer |
| `content.css` | Minor styling for injected cells |
| `icons/` | Toolbar/extension icons (from official Cursor brand assets) |

The `cursor-brand-assets/` directory is reference material only and is not loaded by the extension.

## Notes

- Row-to-event matching is positional (row *N* → `usageEventsDisplay[N]`), with an optional timestamp sanity check on the Date cell `title`.
- No extra API requests are made; data comes from the page's own fetch.
- Hover a cell to see the exact value in its tooltip.
