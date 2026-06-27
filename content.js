(function () {
  "use strict";

  const MESSAGE_SOURCE = "cursor-usage-ext";
  const EXT_COL_ATTR = "data-ext-col";

  const COLUMNS = [
    { id: "effective-tokens", label: "Uncached", valueKey: "effectiveTokens" },
    { id: "cost", label: "Cost", valueKey: "cost" },
    { id: "cost-nominal", label: "Cost (nominal)", valueKey: "costNominal" },
  ];

  const ON_DEMAND_LABEL = "On-Demand Usage this Month";

  let events = [];
  let usageSummary = null;
  let observer = null;
  let observedContainer = null;
  let enrichScheduled = false;
  let onDemandScheduled = false;
  let enriching = false;

  const compactTokenFormat = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const exactTokenFormat = new Intl.NumberFormat(undefined);

  function formatUsdExact(cents) {
    return `$${(Number(cents) / 100).toFixed(4)}`;
  }

  function formatUsdDisplay(cents) {
    return `$${(Number(cents) / 100).toFixed(2)}`;
  }

  function effectiveTokens(event) {
    const usage = event?.tokenUsage || {};
    return (Number(usage.inputTokens) || 0) + (Number(usage.outputTokens) || 0);
  }

  function getCellValues(event) {
    const usage = event.tokenUsage || {};
    const effective = effectiveTokens(event);
    const charged = Number(event.chargedCents) || 0;
    const notional = Number(usage.totalCents) || 0;

    return {
      effectiveTokens: {
        text: compactTokenFormat.format(effective),
        title: `${exactTokenFormat.format(effective)} tokens (input + output)`,
      },
      cost: {
        text: formatUsdDisplay(charged),
        title: formatUsdExact(charged),
      },
      costNominal: {
        text: formatUsdDisplay(notional),
        title: formatUsdExact(notional),
      },
    };
  }

  function setCellContent(cell, text, title) {
    cell.textContent = "";
    const span = document.createElement("span");
    span.textContent = text;
    if (title) {
      span.title = title;
    }
    cell.appendChild(span);
  }

  function findTokensHeaderIndex(headerRow) {
    const headers = [...headerRow.querySelectorAll('[role="columnheader"]')];
    return headers.findIndex((header) => header.textContent.trim() === "Tokens");
  }

  function getRowCells(row) {
    return [...row.querySelectorAll('[role="cell"]')];
  }

  function parseRowTimestampSeconds(row) {
    const dateCell = getRowCells(row)[0];
    if (!dateCell) {
      return null;
    }

    const titled = dateCell.querySelector("[title]");
    const title = titled?.getAttribute("title");
    if (!title) {
      return null;
    }

    const parsed = Date.parse(title);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.floor(parsed / 1000);
  }

  function rowMatchesEvent(row, event) {
    if (!event) {
      return false;
    }

    const rowSeconds = parseRowTimestampSeconds(row);
    if (rowSeconds === null) {
      return true;
    }

    const eventSeconds = Math.floor(Number(event.timestamp) / 1000);
    return rowSeconds === eventSeconds;
  }

  function enrichHeaders(container, tokensIndex) {
    const headerRow = container.querySelector(".dashboard-table-header-row");
    if (!headerRow) {
      return false;
    }

    const headers = [...headerRow.querySelectorAll('[role="columnheader"]')];
    const tokensHeader = headers[tokensIndex];
    if (!tokensHeader) {
      return false;
    }

    const insertBeforeNode = tokensHeader.nextElementSibling;

    for (const column of COLUMNS) {
      if (headerRow.querySelector(`[${EXT_COL_ATTR}="${column.id}"]`)) {
        continue;
      }

      const clone = tokensHeader.cloneNode(true);
      clone.setAttribute(EXT_COL_ATTR, column.id);
      const label = clone.querySelector("span") || clone;
      label.textContent = column.label;
      label.removeAttribute("title");
      headerRow.insertBefore(clone, insertBeforeNode);
    }

    return true;
  }

  function enrichRows(container, tokensIndex) {
    const rowsContainer = container.querySelector(".dashboard-table-rows");
    if (!rowsContainer) {
      return;
    }

    const rows = [...rowsContainer.querySelectorAll(".dashboard-table-row")];

    rows.forEach((row, index) => {
      const cells = getRowCells(row);
      const tokensCell = cells[tokensIndex];
      if (!tokensCell) {
        return;
      }

      const event = events[index];
      const matched = rowMatchesEvent(row, event);
      const values = matched ? getCellValues(event) : null;
      const insertBeforeNode = tokensCell.nextElementSibling;

      for (const column of COLUMNS) {
        let cell = row.querySelector(`[${EXT_COL_ATTR}="${column.id}"]`);
        if (!cell) {
          cell = tokensCell.cloneNode(true);
          cell.setAttribute(EXT_COL_ATTR, column.id);
          row.insertBefore(cell, insertBeforeNode);
        }

        if (!values) {
          setCellContent(cell, "—", "");
          continue;
        }

        const value = values[column.valueKey];
        setCellContent(cell, value.text, value.title);
      }
    });
  }

  function disconnectObserver() {
    if (observer) {
      observer.disconnect();
    }
  }

  function attachObserver(container) {
    if (!container) {
      return;
    }

    if (observedContainer !== container) {
      disconnectObserver();
      observedContainer = container;
      observer = new MutationObserver(() => {
        if (enriching) {
          return;
        }
        scheduleEnrich();
      });
    }

    observer.observe(container, { childList: true, subtree: true });
  }

  function enrich() {
    if (enriching || events.length === 0) {
      return;
    }

    const container = document.querySelector(".dashboard-table-container");
    if (!container) {
      return;
    }

    const headerRow = container.querySelector(".dashboard-table-header-row");
    if (!headerRow) {
      return;
    }

    const tokensIndex = findTokensHeaderIndex(headerRow);
    if (tokensIndex < 0) {
      return;
    }

    enriching = true;
    disconnectObserver();

    try {
      enrichHeaders(container, tokensIndex);
      enrichRows(container, tokensIndex);
    } finally {
      enriching = false;
      attachObserver(container);
    }
  }

  function scheduleEnrich() {
    if (enrichScheduled) {
      return;
    }

    enrichScheduled = true;
    requestAnimationFrame(() => {
      enrichScheduled = false;
      enrich();
    });
  }

  function findOnDemandPanel() {
    for (const label of document.querySelectorAll(".text-secondary")) {
      if (label.textContent.trim() !== ON_DEMAND_LABEL) {
        continue;
      }

      const panel = label.closest(".rounded-xl");
      if (panel) {
        return panel;
      }
    }

    return null;
  }

  function updateOnDemandPanel() {
    const onDemand = usageSummary?.individualUsage?.onDemand;
    if (!onDemand?.enabled) {
      return;
    }

    const panel = findOnDemandPanel();
    if (!panel) {
      return;
    }

    const amountRow = panel.querySelector(".flex.w-full.min-w-0.items-baseline");
    if (!amountRow || amountRow.children.length < 2) {
      return;
    }

    const usedEl = amountRow.children[0];
    const limitEl = amountRow.children[1];

    usedEl.textContent = formatUsdDisplay(onDemand.used);
    limitEl.textContent = `/ ${formatUsdDisplay(onDemand.limit)}`;
  }

  function scheduleOnDemandUpdate() {
    if (onDemandScheduled) {
      return;
    }

    onDemandScheduled = true;
    requestAnimationFrame(() => {
      onDemandScheduled = false;
      updateOnDemandPanel();
    });
  }

  function setupNavigationWatcher() {
    const navObserver = new MutationObserver(() => {
      const container = document.querySelector(".dashboard-table-container");
      if (container && events.length > 0) {
        scheduleEnrich();
      }
      if (usageSummary) {
        scheduleOnDemandUpdate();
      }
    });

    navObserver.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    if (event.data?.source !== MESSAGE_SOURCE) {
      return;
    }

    if (event.data.type === "usage-summary") {
      usageSummary = event.data.payload;
      scheduleOnDemandUpdate();
      return;
    }

    events = event.data.payload?.usageEventsDisplay || [];
    scheduleEnrich();
  });

  setupNavigationWatcher();
  scheduleEnrich();
})();
