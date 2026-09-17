(function () {
  "use strict";

  const MESSAGE_SOURCE = "cursor-usage-ext";
  const READY_SOURCE = "cursor-usage-ext-ready";
  const USAGE_EVENTS_PATH = "get-filtered-usage-events";
  const USAGE_SUMMARY_PATH = "usage-summary";

  const lastPayloads = new Map();

  function postPayload(type, payload) {
    lastPayloads.set(type, payload);
    window.postMessage({ source: MESSAGE_SOURCE, type, payload }, "*");
  }

  // The content script attaches its message listener at document_idle, which can
  // be after the page's first API calls. It posts a ready ping on startup; replay
  // any payloads captured before it was listening.
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== READY_SOURCE) {
      return;
    }
    for (const [type, payload] of lastPayloads) {
      window.postMessage({ source: MESSAGE_SOURCE, type, payload }, "*");
    }
  });

  function getApiType(url) {
    try {
      const value = typeof url === "string" ? url : url?.url || String(url);
      if (value.includes(USAGE_EVENTS_PATH)) {
        return "usage-events";
      }
      if (value.includes(USAGE_SUMMARY_PATH)) {
        return "usage-summary";
      }
      return null;
    } catch {
      return null;
    }
  }

  function handleResponse(type, response) {
    response
      .clone()
      .json()
      .then((payload) => postPayload(type, payload))
      .catch(() => {
        // Ignore non-JSON or unreadable responses.
      });
  }

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    return originalFetch.apply(this, args).then((response) => {
      const input = args[0];
      const url = typeof input === "string" ? input : input?.url;
      const apiType = getApiType(url);
      if (apiType) {
        handleResponse(apiType, response);
      }
      return response;
    });
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__cursorUsageUrl = url;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      const apiType = getApiType(this.__cursorUsageUrl);
      if (!apiType) {
        return;
      }
      try {
        postPayload(apiType, JSON.parse(this.responseText));
      } catch {
        // Ignore parse errors.
      }
    });
    return originalSend.apply(this, args);
  };
})();
