const serverMetrics = new Set([
  "roof", "serialize", "google", "google_headers", "google_body",
  "google_parse", "normalise", "boundary", "selection",
]);

export function createRoofDiagnostics(targetCount) {
  try {
    if (window.sessionStorage.getItem("roofPerf") === "1") {
      return { startedAt: performance.now(), targetCount };
    }
  } catch {
    // Storage may be unavailable in a restricted browsing context.
  }
  return undefined;
}

export function readRoofTimingHeaders(response, diagnostics) {
  const id = response.headers.get("X-Roof-Request-Id");
  if (/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id || "")) {
    diagnostics.requestId = id;
  }

  const timings = {};
  const header = response.headers.get("Server-Timing") || "";
  for (const metric of header.split(",")) {
    const match = /^\s*([a-z_]+);dur=(\d+(?:\.\d+)?)\s*$/.exec(metric);
    if (match && serverMetrics.has(match[1]) && Number.isFinite(Number(match[2]))) {
      timings[match[1]] = Number(match[2]);
    }
  }
  if (Object.keys(timings).length) {
    diagnostics.serverTimingMs = timings;
  }
}

export function readRoofResourceTiming(url, startedAt, diagnostics) {
  if (typeof performance.getEntriesByName !== "function") {
    return;
  }

  const resourceUrl = new URL(url, window.location.href).href;
  const matches = performance.getEntriesByName(resourceUrl, "resource")
    .filter((entry) => entry.initiatorType === "fetch" && entry.startTime >= startedAt - 2);
  if (matches.length !== 1 || !matches[0].responseStart) {
    return;
  }

  const entry = matches[0];
  diagnostics.resourceTiming = {
    dnsMs: entry.domainLookupEnd - entry.domainLookupStart,
    connectMs: entry.connectEnd - entry.connectStart,
    tlsMs: entry.secureConnectionStart > 0
      ? entry.connectEnd - entry.secureConnectionStart
      : undefined,
    timeToFirstByteMs: entry.responseStart - entry.startTime,
    requestToFirstByteMs: entry.requestStart > 0
      ? entry.responseStart - entry.requestStart
      : undefined,
    transferMs: entry.responseEnd - entry.responseStart,
    transferBytes: entry.transferSize,
    encodedBodyBytes: entry.encodedBodySize,
    decodedBodyBytes: entry.decodedBodySize,
  };
}

export function reportRoofDiagnostics(diagnostics, outcome) {
  const { startedAt, ...details } = diagnostics;
  console.info("[roof-perf]", {
    ...details,
    outcome,
    totalMs: performance.now() - startedAt,
  });
}
