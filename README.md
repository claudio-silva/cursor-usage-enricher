<div align="center">
  <img src="icons/icon.png" alt="Usage Enricher icon" width="128">

  # Usage Enricher for Cursor

  **More context for the numbers on Cursor's usage dashboard.**

  ![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)
  ![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
  ![Unofficial](https://img.shields.io/badge/status-unofficial-orange)
</div>

Cursor's dashboard tells you how many tokens a request used and what you were billed. Useful - but not always enough to understand where the cost came from or how caching affected the request.

Usage Enricher is a small Chrome extension that adds that missing context directly to the existing usage table. It uses data the dashboard already loads, without sending additional requests or replacing Cursor's own figures.

## What it adds

The extension adds three columns beside **Tokens** and renames Cursor's original **Cost** column to **Cost (billed)**, making the different figures easier to compare.

| Column | What it tells you | Formula / source |
| --- | --- | --- |
| **Uncached** | How many input and output tokens were processed, excluding cache reads and writes. | `inputTokens + outputTokens` |
| **Cost (tokens)** | The portion of the request price attributed to token usage. | `tokenUsage.totalCents / 100` |
| **Cost (full)** | The request's full calculated price before subscription billing is taken into account. | `chargedCents / 100` |
| **Cost (billed)** | What Cursor says was actually billed: an on-demand amount, `Free`, or `-`. | Cursor's existing dashboard value |

It also:

- shows exact token counts and four-decimal cost values on hover;
- displays on-demand usage and its limit to two decimal places;
- keeps the wider table compact while preserving horizontal scrolling on narrow windows;
- updates automatically as the dashboard refreshes or you navigate within it.

## Installation

The extension is not distributed through the Chrome Web Store. Install it from source as an unpacked extension:

```sh
git clone https://github.com/claudio-silva/cursor-usage-enricher.git
```

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the cloned `cursor-usage-enricher` folder.
5. Open [Cursor's usage dashboard](https://cursor.com/dashboard/usage) and reload the page.

Chrome 111 or newer is required.

### Updating

Pull the latest changes in the cloned repository, then click the extension's **Reload** button on `chrome://extensions`:

```sh
git pull
```

## Using it

Once installed, visit Cursor's usage dashboard as usual. The additional columns appear in the usage-events table; there is no separate interface or configuration.

The values are most useful when comparing:

- total tokens with tokens processed outside the cache;
- token-derived cost with the full calculated request cost;
- calculated cost with the amount Cursor actually billed.

## How it works

Usage Enricher runs only on Cursor dashboard pages. It reads the usage data already returned to the page and presents selected fields in the existing table. It makes no additional API calls, and it re-applies the extra columns when Cursor redraws the dashboard.

The extension does not calculate usage from prompts, inspect editor activity, or independently verify Cursor's billing. It presents values from Cursor's own dashboard responses in a more detailed format.

## Privacy and permissions

All processing happens locally in your browser. The extension:

- runs only on `https://cursor.com/dashboard*`;
- makes no additional network requests;
- does not transmit, store, or share your usage data;
- does not require an account, API key, or external service.

You can inspect the complete source in this repository.

## Limitations and disclaimer

This is an **unofficial, community-built** extension. It is not affiliated with, endorsed by, or supported by Cursor or Anysphere.

It depends on Cursor's undocumented dashboard responses and page structure. Either may change without notice, which can make displayed values incomplete, misaligned, or unavailable until the extension is updated. Treat the added information as a convenience for understanding usage - not as an authoritative invoice, billing audit, or guarantee of future charges. For billing decisions, refer to Cursor's official records and support.

Use of this extension is at your own risk and remains subject to Cursor's Terms of Service. The software is provided without warranty; see the [MIT License](LICENSE) for the full terms.

## License

[MIT](LICENSE) © Claudio Silva
