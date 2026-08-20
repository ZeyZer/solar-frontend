import React, { useEffect, useRef, useState } from "react";

import { analyseSolarTargetBuildings } from "../../api/solarRoofApi";
import { loadGoogleMapsLibrary } from "../../utils/googleMapsLoader";

const DEFAULT_CENTER = {
  lat: 51.2362,
  lng: -0.5704,
};

const TARGET_LABELS = [
  "Main house",
  "Garage",
  "Outbuilding",
  "Annex",
  "Other roof",
];

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getSelectedAddressCenter(selectedAddress) {
  const latitude = numberOrNull(selectedAddress?.latitude);
  const longitude = numberOrNull(selectedAddress?.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    lat: latitude,
    lng: longitude,
  };
}

function makeTargetId() {
  return `target-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roundCoordinate(value) {
  const number = numberOrNull(value);

  if (number === null) {
    return null;
  }

  return Math.round(number * 1000000) / 1000000;
}

function formatNumber(value, decimals = 0, suffix = "") {
  const number = numberOrNull(value);

  if (number === null) {
    return "Unknown";
  }

  return `${number.toFixed(decimals)}${suffix}`;
}

function formatArea(value) {
  return formatNumber(value, 1, " m²");
}

function formatDegrees(value) {
  return formatNumber(value, 1, "°");
}

function azimuthToCompass(value) {
  const number = numberOrNull(value);

  if (number === null) {
    return "Unknown";
  }

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(number / 45) % 8;

  return directions[index];
}

function getGooglePanelPowerKw(building) {
  const panelCount = numberOrNull(building?.solarPotential?.maxArrayPanelsCount);
  const panelWatts = numberOrNull(building?.solarPotential?.panelCapacityWatts);

  if (panelCount === null || panelWatts === null) {
    return null;
  }

  return Math.round((panelCount * panelWatts) / 10) / 100;
}

function getAnalysisTotals(analysis) {
  const buildings = Array.isArray(analysis?.solarBuildingModels)
    ? analysis.solarBuildingModels
    : [];

  return buildings.reduce(
    (totals, building) => {
      const maxPanels = numberOrNull(building?.solarPotential?.maxArrayPanelsCount) || 0;
      const maxArrayArea = numberOrNull(building?.solarPotential?.maxArrayAreaM2) || 0;
      const roofSegments = numberOrNull(building?.roofSegmentCount) || 0;
      const powerKw = getGooglePanelPowerKw(building) || 0;

      return {
        maxPanels: totals.maxPanels + maxPanels,
        maxArrayAreaM2: totals.maxArrayAreaM2 + maxArrayArea,
        roofSegments: totals.roofSegments + roofSegments,
        googleArrayKw: totals.googleArrayKw + powerKw,
      };
    },
    {
      maxPanels: 0,
      maxArrayAreaM2: 0,
      roofSegments: 0,
      googleArrayKw: 0,
    }
  );
}

function buildSolarRoofGeometryPayload({
  selectedAddress,
  addressContext,
  solarTargetBuildings,
  solarApiAnalysis,
}) {
  return {
    source: "google_solar_api_building_target_selector",
    version: "F3C.4g",
    diagnosticOnly: true,
    usedForCalculation: false,
    usedForPricing: false,
    usedForRecommendation: false,

    addressContext: {
      ...(addressContext || {}),
      selectedAddress: selectedAddress || null,
      mapProvider: "google_maps",
      mapType: "hybrid",
      mapCentredFrom: selectedAddress
        ? "google_places_selected_address"
        : "manual_map_position",
    },

    solarTargetBuildings,

    solarApiAnalysis: solarApiAnalysis || null,
    solarBuildingModels: solarApiAnalysis?.solarBuildingModels || [],
    targetResults: solarApiAnalysis?.targetResults || [],
    analysisSummary: solarApiAnalysis?.summary || null,

    warnings: [
      "Diagnostic only. Google Solar API roof models are not survey verified.",
      "Final panel layout, roof suitability and installation details must be confirmed by Zion Energy.",
    ],
  };
}

export default function SolarTargetBuildingSelector({
  selectedAddress,
  addressContext,
  value,
  onChange,
  initialZoom = 20,
}) {
  const mapContainerRef = useRef(null);
  const googleRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const mapClickListenerRef = useRef(null);

  const selectedAddressRef = useRef(selectedAddress);
  const addressContextRef = useRef(addressContext);
  const onChangeRef = useRef(onChange);

  const [mapStatus, setMapStatus] = useState("Loading Google satellite map…");
  const [targetLabel, setTargetLabel] = useState("Main house");
  const [customLabel, setCustomLabel] = useState("");

  const [solarTargetBuildings, setSolarTargetBuildings] = useState(
    Array.isArray(value?.solarTargetBuildings) ? value.solarTargetBuildings : []
  );

  const [solarApiAnalysis, setSolarApiAnalysis] = useState(
    value?.solarApiAnalysis || null
  );

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const targetLabelRef = useRef(targetLabel);
  const customLabelRef = useRef(customLabel);
  const solarTargetBuildingsRef = useRef(solarTargetBuildings);
  const solarApiAnalysisRef = useRef(solarApiAnalysis);

  useEffect(() => {
    selectedAddressRef.current = selectedAddress;
  }, [selectedAddress]);

  useEffect(() => {
    addressContextRef.current = addressContext;
  }, [addressContext]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    targetLabelRef.current = targetLabel;
  }, [targetLabel]);

  useEffect(() => {
    customLabelRef.current = customLabel;
  }, [customLabel]);

  useEffect(() => {
    solarTargetBuildingsRef.current = solarTargetBuildings;
  }, [solarTargetBuildings]);

  useEffect(() => {
    solarApiAnalysisRef.current = solarApiAnalysis;
  }, [solarApiAnalysis]);

  function emitChange(nextTargets, nextAnalysis = solarApiAnalysisRef.current) {
    const payload = buildSolarRoofGeometryPayload({
      selectedAddress: selectedAddressRef.current,
      addressContext: addressContextRef.current,
      solarTargetBuildings: nextTargets,
      solarApiAnalysis: nextAnalysis,
    });

    if (onChangeRef.current) {
      onChangeRef.current(payload);
    }
  }

  function clearMarkers() {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  }

  function renderMarkers(nextTargets) {
    const google = googleRef.current;
    const map = mapRef.current;

    if (!google || !map) {
      return;
    }

    clearMarkers();

    markersRef.current = nextTargets.map((target, index) => {
      return new google.maps.Marker({
        map,
        position: {
          lat: target.latitude,
          lng: target.longitude,
        },
        label: String(index + 1),
        title: target.label,
      });
    });
  }

  function getNextLabel() {
    const currentLabel = targetLabelRef.current;
    const currentCustomLabel = customLabelRef.current;

    if (currentLabel === "Other roof") {
      return currentCustomLabel.trim() || "Other roof";
    }

    return currentLabel;
  }

  function addTargetFromMapClick(latLng) {
    if (!latLng) {
      return;
    }

    const currentTargets = Array.isArray(solarTargetBuildingsRef.current)
      ? solarTargetBuildingsRef.current
      : [];

    const nextTarget = {
      id: makeTargetId(),
      label: getNextLabel(),
      source: "user_clicked_google_map",
      latitude: roundCoordinate(latLng.lat()),
      longitude: roundCoordinate(latLng.lng()),
    };

    const nextTargets = [...currentTargets, nextTarget];

    solarTargetBuildingsRef.current = nextTargets;
    solarApiAnalysisRef.current = null;

    setSolarTargetBuildings(nextTargets);
    setSolarApiAnalysis(null);
    setAnalysisError("");
    renderMarkers(nextTargets);
    emitChange(nextTargets, null);

    setMapStatus(
      `${nextTarget.label} target added. Add another building if needed, or analyse selected buildings.`
    );

    if (targetLabelRef.current === "Main house") {
      targetLabelRef.current = "Garage";
      setTargetLabel("Garage");
    }
  }

  function removeTarget(targetId) {
    const currentTargets = Array.isArray(solarTargetBuildingsRef.current)
      ? solarTargetBuildingsRef.current
      : [];

    const nextTargets = currentTargets.filter(
      (target) => target.id !== targetId
    );

    solarTargetBuildingsRef.current = nextTargets;
    solarApiAnalysisRef.current = null;

    setSolarTargetBuildings(nextTargets);
    setSolarApiAnalysis(null);
    setAnalysisError("");
    renderMarkers(nextTargets);
    emitChange(nextTargets, null);
  }

  function clearTargets() {
    solarTargetBuildingsRef.current = [];
    solarApiAnalysisRef.current = null;

    setSolarTargetBuildings([]);
    setSolarApiAnalysis(null);
    setAnalysisError("");
    clearMarkers();
    emitChange([], null);
    setMapStatus("Targets cleared. Click the main building roof to start again.");
  }

  function centreMapOnSelectedAddress() {
    const map = mapRef.current;
    const center = getSelectedAddressCenter(selectedAddressRef.current);

    if (!map || !center) {
      setMapStatus(
        "No selected address coordinates found. Go back to Step 1 and select the exact address."
      );
      return;
    }

    map.setCenter(center);
    map.setZoom(initialZoom);
    setMapStatus("Map centred on selected address. Click the building roof you want to assess.");
  }

  async function analyseTargets() {
    const currentTargets = Array.isArray(solarTargetBuildingsRef.current)
      ? solarTargetBuildingsRef.current
      : [];

    if (!currentTargets.length) {
      setAnalysisError("Select at least one building target first.");
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError("");
    setMapStatus("Analysing selected buildings with Google Solar API…");

    try {
      const result = await analyseSolarTargetBuildings({
        solarTargetBuildings: currentTargets,
        requiredQuality: "BASE",
      });

      solarApiAnalysisRef.current = result;

      setSolarApiAnalysis(result);
      emitChange(currentTargets, result);

      setMapStatus(
        result?.summary?.uniqueBuildingsReturned
          ? `Solar roof model found for ${result.summary.uniqueBuildingsReturned} unique building(s).`
          : "Analysis completed, but no unique roof models were returned."
      );
    } catch (err) {
      console.warn("Solar roof target analysis failed:", err);
      setAnalysisError(
        err?.message || "Could not analyse the selected buildings."
      );
      setMapStatus("Solar roof analysis failed. Check the backend is running and try again.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey || mapRef.current) {
      return;
    }

    let cancelled = false;

    async function initialiseMap() {
      try {
        const mapsLibrary = await loadGoogleMapsLibrary("maps");

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const google = window.google;

        if (!google?.maps) {
          throw new Error("Google Maps namespace was not available after loadGoogleMapsLibrary().");
        }

        const center = getSelectedAddressCenter(selectedAddressRef.current) || DEFAULT_CENTER;

        const map = new mapsLibrary.Map(mapContainerRef.current, {
          center,
          zoom: initialZoom,
          mapTypeId: "hybrid",
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          rotateControl: false,
          tilt: 0,
          clickableIcons: false,
          gestureHandling: "greedy",
          draggableCursor: "crosshair",
        });

        googleRef.current = google;
        mapRef.current = map;

        mapClickListenerRef.current = map.addListener("click", (event) => {
          addTargetFromMapClick(event.latLng);
        });

        if (solarTargetBuildings.length > 0) {
          renderMarkers(solarTargetBuildings);
        }

        setMapStatus(
          selectedAddressRef.current
            ? "Map centred on selected address. Click the main building roof first."
            : "Map loaded. Go back to Step 1 and select the exact address."
        );
      } catch (err) {
        console.error("Failed to load Google Solar target selector map:", err);

        const message =
          err?.message ||
          err?.error ||
          String(err) ||
          "Unknown Google Maps loading error";

        setMapStatus(
          `Google Maps failed to load: ${message}. Check your API key, billing, referrer restrictions and enabled APIs.`
        );
      }
    }

    initialiseMap();

    return () => {
      cancelled = true;

      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
      }

      clearMarkers();

      mapRef.current = null;
      googleRef.current = null;
    };

    // Initialise the map once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    selectedAddressRef.current = selectedAddress;

    if (mapRef.current && selectedAddress) {
      centreMapOnSelectedAddress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.latitude, selectedAddress?.longitude]);

  if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Google Maps API key missing. Add{" "}
        <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code>{" "}
        and restart the frontend.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Select roof buildings to analyse
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          Click the roof of each building you want us to assess — for example
          the main house, garage or outbuilding. We will use Google Solar API to
          retrieve roof segments, pitch, azimuth, usable area and panel-position
          estimates.
        </p>

        {selectedAddress?.fullAddress && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Selected address</p>
            <p className="mt-1">{selectedAddress.fullAddress}</p>

            <button
              type="button"
              className="secondary-mini mt-3"
              onClick={centreMapOnSelectedAddress}
            >
              Re-centre on selected address
            </button>
          </div>
        )}

        {!selectedAddress && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">No selected address found</p>
            <p className="mt-1">
              Go back to Step 1 and select the exact address before choosing
              roof targets.
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr]">
          <label className="text-sm">
            <span className="block font-medium text-slate-700">
              Next click label
            </span>

            <select
              className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              value={targetLabel}
              onChange={(event) => {
                const nextLabel = event.target.value;
                targetLabelRef.current = nextLabel;
                setTargetLabel(nextLabel);
              }}
            >
              {TARGET_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {targetLabel === "Other roof" && (
            <label className="text-sm">
              <span className="block font-medium text-slate-700">
                Custom label
              </span>

              <input
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                value={customLabel}
                onChange={(event) => {
                  const nextCustomLabel = event.target.value;
                  customLabelRef.current = nextCustomLabel;
                  setCustomLabel(nextCustomLabel);
                }}
                placeholder="e.g. Workshop roof"
              />
            </label>
          )}
        </div>

        <p className="mt-3 text-sm text-slate-600">{mapStatus}</p>

        <div
          ref={mapContainerRef}
          className="mt-4 h-[460px] w-full overflow-hidden rounded-xl border border-slate-200"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={analyseTargets}
            disabled={analysisLoading || solarTargetBuildings.length === 0}
          >
            {analysisLoading ? "Analysing…" : "Analyse selected buildings"}
          </button>

          <button
            type="button"
            className="secondary-mini"
            onClick={clearTargets}
            disabled={analysisLoading || solarTargetBuildings.length === 0}
          >
            Clear targets
          </button>
        </div>

        {analysisError && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            {analysisError}
          </div>
        )}
      </div>

      {solarTargetBuildings.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="font-semibold text-slate-900">
            Selected building targets
          </h4>

          <div className="mt-3 space-y-2">
            {solarTargetBuildings.map((target, index) => (
              <div
                key={target.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {index + 1}. {target.label}
                  </p>
                  <p className="text-slate-500">
                    {target.latitude}, {target.longitude}
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-mini"
                  onClick={() => removeTarget(target.id)}
                  disabled={analysisLoading}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {solarApiAnalysis?.summary && (() => {
        const totals = getAnalysisTotals(solarApiAnalysis);

        return (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            <h4 className="font-semibold">Google Solar roof model summary</h4>

            <p className="mt-1">
              Google Solar API found roof model data for the selected building target.
              This gives us pitch, azimuth, roof segments, imagery quality and Google’s
              own maximum panel-position estimate.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-white/70 p-3">
                <p className="text-xs uppercase tracking-wide">Unique buildings</p>
                <p className="text-lg font-semibold">
                  {solarApiAnalysis.summary.uniqueBuildingsReturned}
                </p>
              </div>

              <div className="rounded-lg bg-white/70 p-3">
                <p className="text-xs uppercase tracking-wide">Roof segments</p>
                <p className="text-lg font-semibold">{totals.roofSegments}</p>
              </div>

              <div className="rounded-lg bg-white/70 p-3">
                <p className="text-xs uppercase tracking-wide">Google max panels</p>
                <p className="text-lg font-semibold">{totals.maxPanels}</p>
              </div>

              <div className="rounded-lg bg-white/70 p-3">
                <p className="text-xs uppercase tracking-wide">Google array size</p>
                <p className="text-lg font-semibold">
                  {totals.googleArrayKw ? `${totals.googleArrayKw.toFixed(1)} kWp` : "Unknown"}
                </p>
              </div>
            </div>

            {solarApiAnalysis.summary.duplicateBuildingsRemoved > 0 && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                {solarApiAnalysis.summary.duplicateBuildingsRemoved} duplicate target
                {solarApiAnalysis.summary.duplicateBuildingsRemoved === 1 ? "" : "s"} removed.
                This usually means two clicks matched the same Google building model.
              </div>
            )}

            {solarApiAnalysis.summary.notFoundTargets > 0 && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">
                Google Solar API could not find a known building for{" "}
                {solarApiAnalysis.summary.notFoundTargets} selected target
                {solarApiAnalysis.summary.notFoundTargets === 1 ? "" : "s"}. Try clicking
                closer to the centre of the building roof.
              </div>
            )}

            {solarApiAnalysis.solarBuildingModels?.length > 0 && (
              <div className="mt-4 space-y-4">
                {solarApiAnalysis.solarBuildingModels.map((building) => {
                  const googleArrayKw = getGooglePanelPowerKw(building);
                  const roofSegments = Array.isArray(building.roofSegments)
                    ? building.roofSegments
                    : [];

                  return (
                    <div
                      key={building.id}
                      className="rounded-lg border border-emerald-200 bg-white/80 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-emerald-950">
                            {building.targetLabel || building.id}
                          </p>

                          <p className="mt-1 text-emerald-900">
                            {building.postalCode || "Unknown postcode"} · Imagery{" "}
                            {building.imagery?.quality || "Unknown"}
                            {building.imagery?.date ? ` · ${building.imagery.date}` : ""}
                          </p>
                        </div>

                        <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-950">
                          Diagnostic only
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide">Segments</p>
                          <p className="font-semibold">{building.roofSegmentCount ?? "Unknown"}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide">Google max panels</p>
                          <p className="font-semibold">
                            {building.solarPotential?.maxArrayPanelsCount ?? "Unknown"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide">Google array</p>
                          <p className="font-semibold">
                            {googleArrayKw ? `${googleArrayKw.toFixed(1)} kWp` : "Unknown"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide">Array area</p>
                          <p className="font-semibold">
                            {formatArea(building.solarPotential?.maxArrayAreaM2)}
                          </p>
                        </div>
                      </div>

                      {roofSegments.length > 0 && (
                        <div className="mt-4">
                          <p className="font-semibold">Detected roof segments</p>

                          <div className="mt-2 grid gap-2">
                            {roofSegments.slice(0, 6).map((segment, index) => (
                              <div
                                key={segment.id || index}
                                className="grid gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 md:grid-cols-4"
                              >
                                <div>
                                  <p className="text-xs uppercase tracking-wide">Segment</p>
                                  <p className="font-semibold">{index + 1}</p>
                                </div>

                                <div>
                                  <p className="text-xs uppercase tracking-wide">Direction</p>
                                  <p className="font-semibold">
                                    {azimuthToCompass(segment.azimuthDegrees)}{" "}
                                    <span className="font-normal">
                                      ({formatDegrees(segment.azimuthDegrees)})
                                    </span>
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs uppercase tracking-wide">Pitch</p>
                                  <p className="font-semibold">
                                    {formatDegrees(segment.pitchDegrees)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs uppercase tracking-wide">Area</p>
                                  <p className="font-semibold">{formatArea(segment.areaM2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {roofSegments.length > 6 && (
                            <p className="mt-2 text-xs">
                              Showing first 6 of {roofSegments.length} detected segments.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                        For semi-detached or terraced properties, this may include
                        roof area beyond the customer-owned boundary. Zion Energy must
                        confirm the final usable roof boundary before design.
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-xs">
              Diagnostic only. Google panel count uses Google’s own assumptions, not
              Zion Energy’s final panel catalogue, setbacks, obstructions or
              installation design.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
