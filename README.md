<div align="center">
  <img src="icons/icon.png" alt="Usage Enricher icon" width="128">

  # Usage Enricher for Cursor

  **A Chrome extension that reveals the real numbers behind your Cursor usage.**

  ![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)
  ![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
  ![Unofficial](https://img.shields.io/badge/status-unofficial-orange)
</div>

Cursor's usage dashboard shows you *what* you were charged, but not the full picture.
This extension enriches the dashboard with per-request token and cost data that the
page already fetches but doesn't display.

## Features

On the usage events table, three columns are inserted right after **Tokens**,
and the dashboard's own trailing **Cost** column is relabeled so the three
cost figures are easy to tell apart:

| Column | Origin | Meaning |
| --- | --- | --- |
| **Uncached** | injected | `tokenUsage.inputTokens + tokenUsage.outputTokens` - tokens that were actually processed (excludes cache reads/writes) |
| **Cost (tokens)** | injected | `tokenUsage.totalCents / 100` - the pure token-derived price of the request |
| **Cost (full)** | injected | `chargedCents / 100` - the full request-level price: what the request would cost if billed outside the subscription (≥ Cost (tokens)) |
| **Cost (billed)** | native, relabeled from **Cost** | what was actually billed - `-`, `Free`, or an on-demand amount |
- The **On-Demand Usage this Month** card is reformatted to two decimal places
  (`$81.31 / $100.00` instead of `$81 / $100`).
- To fit the extra columns without horizontal scrolling, the extension tightens
  the row gap and slims the Date, Type, and Cost columns. On narrow windows the
  table still scrolls horizontally, same as the native table.
- Hover any injected cell for the exact value (full token counts, 4-decimal costs).
- Re-applies automatically when React redraws or you navigate within the dashboard.

## How it works

No extra requests are made - the extension reads the responses of the page's own
API calls:

1. **`interceptor.js`** (MAIN world, `document_start`) patches `fetch` and
   `XMLHttpRequest` on `cursor.com/dashboard*` and forwards the payloads of
   `POST /api/dashboard/get-filtered-usage-events` and `GET /api/usage-summary`
   to the page via `window.postMessage`. It buffers the latest payload of each
   type and replays it when the content script announces itself - this covers
   API responses that arrive before `document_idle`, which would otherwise be
   dispatched to zero listeners and lost.
2. **`content.js`** (isolated world) sends a ready ping on startup, receives
   those payloads, caches the usage
   events, and injects header/body cells by cloning the existing **Tokens**
   column cells (preserving width and alignment). A `MutationObserver` re-applies
   the enrichment whenever the dashboard re-renders.

Row-to-event matching is positional (row *N* → `usageEventsDisplay[N]`), with an
optional timestamp sanity check on the Date cell's `title` attribute.

## Install (load unpacked)

1. Clone this repository
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the cloned folder
5. Open [cursor.com/dashboard/usage](https://cursor.com/dashboard/usage) and reload

Requires Chrome **111+** (Manifest V3 `world: "MAIN"` content scripts).

## Privacy

The extension runs entirely in your browser. It makes **no additional network
requests** and sends **no data anywhere** - it only reads the responses of API
calls the dashboard itself makes while you're logged in.

## Disclaimer

This is an **unofficial, community-built** extension. It is not affiliated with,
endorsed by, or supported by Cursor or Anysphere.

It relies on Cursor's **undocumented internal API endpoints and DOM structure**,
which may change or break at any time without notice - and may break this
extension with them.

**This software is provided "as is", without warranty of any kind. By using it,
you accept full responsibility for that use**, including compliance with
Cursor's Terms of Service and any consequences thereof. The author assumes no
liability for any damages, data issues, or account actions arising from its use.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | Extension manifest |
| `interceptor.js` | Network interception bridge (MAIN world) |
| `content.js` | Table enrichment + mutation observer |
| `content.css` | Styling for injected cells and column widths |
| `icons/` | Extension icons |

## License

[MIT](LICENSE) © Claudio Silva
