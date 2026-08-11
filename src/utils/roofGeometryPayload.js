import area from "@turf/area";

export function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function makeRoofPlaneId(index) {
  return `drawn-roof-${index + 1}`;
}

export function getPolygonCoordinates(feature) {
  const coordinates = feature?.geometry?.coordinates?.[0];

  if (!Array.isArray(coordinates)) {
    return [];
  }

  // Mapbox/GeoJSON polygons close the ring by repeating the first coordinate.
  // Backend contract expects the usable points, not necessarily the repeated close point.
  const cleaned = coordinates.map(([lng, lat]) => [Number(lng), Number(lat)]);

  if (cleaned.length > 1) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];

    if (first[0] === last[0] && first[1] === last[1]) {
      return cleaned.slice(0, -1);
    }
  }

  return cleaned;
}

export function getPolygonAreaM2(feature) {
  try {
    return round2(area(feature));
  } catch {
    return null;
  }
}

export function buildRoofPlaneFromFeature({ feature, index, details = {} }) {
  const coordinates = getPolygonCoordinates(feature);
  const areaM2 = getPolygonAreaM2(feature);

  return {
    id: details.id || makeRoofPlaneId(index),
    label: details.label || `Roof ${index + 1}`,

    source: "manual_roof_polygon",
    geometryType: "polygon",

    orientation: details.orientation || "unknown",
    tilt:
      details.tilt === "" || details.tilt === null || details.tilt === undefined
        ? null
        : Number(details.tilt),
    shading: details.shading || "unknown",

    areaM2,
    usableAreaM2: areaM2,

    coordinates,

    obstacles: [],

    setbacks: {
      edgeMm: null,
      ridgeMm: null,
      valleyMm: null,
      partyWallMm: null,
    },

    physicalFitVerified: false,
    panelDimensionFitVerified: false,

    notes: "User-drawn roof area. Not survey verified.",
  };
}

export function buildRoofGeometryPayload({ roofPlanes = [], addressContext = null }) {
  return {
    source: "manual_roof_polygon",
    captureMethod: "user_drawn_map_polygon",
    geometryVersion: "draw_my_roof_mvp_1",

    addressContext,

    roofPlanes,
  };
}

export function validateRoofPlane(plane) {
  const issues = [];

  if (!Array.isArray(plane.coordinates) || plane.coordinates.length < 3) {
    issues.push("Draw at least three points for the roof area.");
  }

  if (!plane.orientation || plane.orientation === "unknown") {
    issues.push("Select the roof orientation.");
  }

  if (plane.tilt === null || plane.tilt === undefined || Number.isNaN(Number(plane.tilt))) {
    issues.push("Enter the roof pitch.");
  }

  if (!plane.shading || plane.shading === "unknown") {
    issues.push("Select the shading level.");
  }

  if (!plane.areaM2 || plane.areaM2 < 3) {
    issues.push("The drawn roof area looks too small.");
  }

  return issues;
}

export function validateRoofGeometryPayload(payload) {
  const roofPlanes = Array.isArray(payload?.roofPlanes)
    ? payload.roofPlanes
    : [];

  if (roofPlanes.length === 0) {
    return ["Draw at least one roof area."];
  }

  return roofPlanes.flatMap((plane, index) =>
    validateRoofPlane(plane).map((issue) => `Roof ${index + 1}: ${issue}`)
  );
}