(function () {
  "use strict";

  const MESSAGE_SOURCE = "cursor-usage-ext";
  const API_PATH = "get-filtered-usage-events";

  function postPayload(payload) {
    window.postMessage({ source: MESSAGE_SOURCE, payload }, "*");
  }

  function isUsageEventsUrl(url) {
    try {
      const value = typeof url === "string" ? url : url?.url || String(url);
      return value.includes(API_PATH);
    } catch {
      return false;
    }
  }

  function handleResponse(response) {
    response
      .clone()
      .json()
      .then((payload) => postPayload(payload))
      .catch(() => {
        // Ignore non-JSON or unreadable responses.
      });
  }

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    return originalFetch.apply(this, args).then((response) => {
      const input = args[0];
      const url = typeof input === "string" ? input : input?.url;
      if (isUsageEventsUrl(url)) {
        handleResponse(response);
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
      if (!isUsageEventsUrl(this.__cursorUsageUrl)) {
        return;
      }
      try {
        postPayload(JSON.parse(this.responseText));
      } catch {
        // Ignore parse errors.
      }
    });
    return originalSend.apply(this, args);
  };
})();
