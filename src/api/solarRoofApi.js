function getBackendBaseUrl() {
  const explicitBaseUrl =
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
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
}) {
  if (!Array.isArray(solarTargetBuildings) || solarTargetBuildings.length === 0) {
    throw new Error("Select at least one building target first.");
  }

  return fetchJson(buildApiUrl("/api/solar-roof/building-insights/batch"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requiredQuality,
      includeDetectedArrays,
      maxTargets,
      solarTargetBuildings,
    }),
  });
}
