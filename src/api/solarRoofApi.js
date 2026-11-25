import { readRoofResourceTiming, readRoofTimingHeaders } from "./roofPerformance";

function getBackendBaseUrl() {
  const explicitBaseUrl =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    "";

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:4000";
  }

  return "";
}

function buildApiUrl(path) {
  const baseUrl = getBackendBaseUrl();
  return `${baseUrl}${path}`;
}

async function fetchJson(url, options, diagnostics) {
  const startedAt = diagnostics && performance.now();
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (diagnostics) {
      diagnostics.requestMs = performance.now() - startedAt;
    }
    throw error;
  }

  if (diagnostics) {
    diagnostics.toHeadersMs = performance.now() - startedAt;
    diagnostics.status = response.status;
    readRoofTimingHeaders(response, diagnostics);
  }

  let data = null;

  try {
    if (diagnostics) {
      const bodyStartedAt = performance.now();
      let body;
      try {
        body = await response.text();
      } finally {
        diagnostics.bodyReadMs = performance.now() - bodyStartedAt;
      }

      const parseStartedAt = performance.now();
      try {
        data = JSON.parse(body);
      } finally {
        diagnostics.jsonParseMs = performance.now() - parseStartedAt;
      }

      if (typeof TextEncoder !== "undefined") {
        diagnostics.decodedTextBytesEstimate = new TextEncoder().encode(body).byteLength;
      }
    } else {
      data = await response.json();
    }
  } catch {
    data = null;
  }

  if (diagnostics) {
    diagnostics.requestMs = performance.now() - startedAt;
    readRoofResourceTiming(url, startedAt, diagnostics);
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Solar roof API request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

export async function analyseSolarTargetBuildings({
  solarTargetBuildings,
  requiredQuality = "BASE",
  includeDetectedArrays = false,
  maxTargets,
  propertyType = "unknown",
  propertyBoundary = null,
  signal,
  diagnostics,
}) {
  if (!Array.isArray(solarTargetBuildings) || solarTargetBuildings.length === 0) {
    throw new Error("Select at least one building target first.");
  }

  return fetchJson(buildApiUrl("/api/solar-roof/building-insights/batch"), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requiredQuality,
      includeDetectedArrays,
      maxTargets,
      propertyType,
      propertyBoundary,
      solarTargetBuildings,
    }),
  }, diagnostics);
}
