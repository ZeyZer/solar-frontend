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

function inferLegacyShadingFromSunshine(segment) {
  const quantiles = Array.isArray(segment?.sunshineQuantiles)
    ? segment.sunshineQuantiles
    : [];

  const medianSunshine = numberOrNull(quantiles[5] ?? quantiles[4]);

  if (medianSunshine === null) {
    return "some";
  }

  if (medianSunshine >= 760) {
    return "none";
  }

  if (medianSunshine >= 620) {
    return "some";
  }

  return "a_lot";
}

function isLikelyUsableCalculationSegment(segment) {
  const areaM2 = numberOrNull(segment?.areaM2);
  const compass = azimuthToCompass(segment?.azimuthDegrees);

  if (areaM2 === null || areaM2 < 8) {
    return false;
  }

  // Avoid using clearly north-facing roof areas for the first automated
  // estimate unless they are the only available segments.
  if (compass === "N") {
    return false;
  }

  return true;
}

function makeCalculationRoofId(buildingId, segmentIndex) {
  return `ai-roof-${buildingId || "building"}-${segmentIndex + 1}`;
}

function distributePanelsAcrossSegments({ building, segments }) {
  const maxPanels =
    numberOrNull(building?.solarPotential?.maxArrayPanelsCount) || 0;

  if (!maxPanels || !segments.length) {
    return [];
  }

  const totalArea = segments.reduce(
    (sum, segment) => sum + (numberOrNull(segment?.areaM2) || 0),
    0
  );

  if (!totalArea) {
    return [];
  }

  const rawAllocations = segments.map((segment, index) => {
    const areaM2 = numberOrNull(segment?.areaM2) || 0;
    const exactPanels = (maxPanels * areaM2) / totalArea;
    const basePanels = Math.max(1, Math.floor(exactPanels));

    return {
      index,
      segment,
      exactPanels,
      panels: basePanels,
      remainder: exactPanels - basePanels,
    };
  });

  let allocatedPanels = rawAllocations.reduce(
    (sum, item) => sum + item.panels,
    0
  );

  let remainingPanels = Math.max(maxPanels - allocatedPanels, 0);

  const sortedByRemainder = [...rawAllocations].sort(
    (a, b) => b.remainder - a.remainder
  );

  for (const item of sortedByRemainder) {
    if (remainingPanels <= 0) {
      break;
    }

    item.panels += 1;
    remainingPanels -= 1;
  }

  // If floor allocation ever overshoots because of very small segments, trim
  // from the smallest allocations.
  allocatedPanels = rawAllocations.reduce((sum, item) => sum + item.panels, 0);

  if (allocatedPanels > maxPanels) {
    let panelsToRemove = allocatedPanels - maxPanels;

    const sortedSmallestFirst = [...rawAllocations].sort(
      (a, b) => a.panels - b.panels
    );

    for (const item of sortedSmallestFirst) {
      if (panelsToRemove <= 0) {
        break;
      }

      const removable = Math.min(item.panels - 1, panelsToRemove);

      if (removable > 0) {
        item.panels -= removable;
        panelsToRemove -= removable;
      }
    }
  }

  return rawAllocations.filter((item) => item.panels > 0);
}

function getRoofSelectionModel(building) {
  return building?.roofSelectionModel || null;
}

function getRoofSelectionTitle(model) {
  const mode = model?.summary?.defaultSelectionMode;

  if (mode === "recommended_segments") {
    return "Recommended roof areas selected";
  }

  if (mode === "recommended_plus_optional_to_reach_target") {
    return "Recommended roof areas plus useful optional areas";
  }

  if (mode === "best_optional_segment") {
    return "Suggested roof area for review";
  }

  return "Roof areas need review";
}

function getRoofSelectionDescription(model) {
  const mode = model?.summary?.defaultSelectionMode;

  if (mode === "best_optional_segment") {
    return "We found a usable roof area, but it needs confirmation before treating it as a strong recommendation.";
  }

  if (mode === "recommended_plus_optional_to_reach_target") {
    return "We selected the strongest roof areas and added useful optional areas to reach a sensible starting panel count.";
  }

  if (mode === "recommended_segments") {
    return "We selected the roof areas that look most suitable based on direction, pitch, solar yield and Google roof data.";
  }

  return "Please review the roof areas before using this estimate.";
}

function getCalculationTargetPanels(model) {
  const suggested = numberOrNull(model?.suggestedPanelRange?.expected);
  const editableDefault = numberOrNull(model?.editablePanelRange?.defaultValue);
  const selectedCapacity = numberOrNull(model?.summary?.defaultSelectedCapacityPanels);
  const selectableCapacity = numberOrNull(model?.summary?.selectableCapacityPanels);

  const rawTarget =
    suggested ||
    editableDefault ||
    selectedCapacity ||
    selectableCapacity ||
    0;

  const max =
    selectedCapacity ||
    selectableCapacity ||
    rawTarget ||
    0;

  if (!rawTarget || !max) {
    return 0;
  }

  return Math.min(Math.max(1, Math.round(rawTarget)), max);
}

function getRoofSelectionSegmentsForEstimate(model) {
  const defaultSelectedSegments = Array.isArray(model?.defaultSelectedSegments)
    ? model.defaultSelectedSegments
    : [];

  if (defaultSelectedSegments.length > 0) {
    return defaultSelectedSegments;
  }

  const recommendedSegments = Array.isArray(model?.recommendedSegments)
    ? model.recommendedSegments
    : [];

  if (recommendedSegments.length > 0) {
    return recommendedSegments;
  }

  const optionalSegments = Array.isArray(model?.optionalSegments)
    ? model.optionalSegments
    : [];

  return optionalSegments.slice(0, 1);
}

function inferLegacyShadingFromRoofSelectionSegment(segment) {
  const sunshineClass = String(segment?.sunshineClass || "").toLowerCase();
  const selectionStatus = String(segment?.selectionStatus || "").toLowerCase();
  const annualKwhPerKwp = numberOrNull(segment?.annualKwhPerKwp);

  if (sunshineClass === "very_low" || sunshineClass === "low") {
    return "a_lot";
  }

  if (annualKwhPerKwp !== null && annualKwhPerKwp < 650) {
    return "a_lot";
  }

  if (selectionStatus === "optional") {
    return "some";
  }

  if (sunshineClass === "medium") {
    return "some";
  }

  if (annualKwhPerKwp !== null && annualKwhPerKwp < 800) {
    return "some";
  }

  return "none";
}

function distributePanelsAcrossRoofSelectionSegments({ segments, targetPanels }) {
  const cleanSegments = Array.isArray(segments)
    ? segments.filter((segment) => (numberOrNull(segment?.maxPanels) || 0) > 0)
    : [];

  const target = Math.max(0, Math.round(numberOrNull(targetPanels) || 0));

  if (!cleanSegments.length || target <= 0) {
    return [];
  }

  const totalCapacity = cleanSegments.reduce(
    (sum, segment) => sum + (numberOrNull(segment?.maxPanels) || 0),
    0
  );

  const cappedTarget = Math.min(target, totalCapacity);

  const allocations = cleanSegments.map((segment, index) => {
    const maxPanels = numberOrNull(segment?.maxPanels) || 0;
    const exactPanels = (cappedTarget * maxPanels) / totalCapacity;
    const basePanels = Math.min(maxPanels, Math.floor(exactPanels));

    return {
      index,
      segment,
      maxPanels,
      exactPanels,
      panels: basePanels,
      remainder: exactPanels - basePanels,
    };
  });

  let allocatedPanels = allocations.reduce(
    (sum, allocation) => sum + allocation.panels,
    0
  );

  while (allocatedPanels < cappedTarget) {
    const next = allocations
      .filter((allocation) => allocation.panels < allocation.maxPanels)
      .sort((a, b) => {
        if (b.remainder !== a.remainder) {
          return b.remainder - a.remainder;
        }

        return b.maxPanels - a.maxPanels;
      })[0];

    if (!next) {
      break;
    }

    next.panels += 1;
    next.remainder = 0;
    allocatedPanels += 1;
  }

  while (allocatedPanels > cappedTarget) {
    const next = allocations
      .filter((allocation) => allocation.panels > 0)
      .sort((a, b) => {
        if (a.panels !== b.panels) {
          return a.panels - b.panels;
        }

        return a.maxPanels - b.maxPanels;
      })[0];

    if (!next) {
      break;
    }

    next.panels -= 1;
    allocatedPanels -= 1;
  }

  return allocations.filter((allocation) => allocation.panels > 0);
}

function buildEditableRoofEstimatesFromSolarAnalysis(analysis) {
  const buildings = Array.isArray(analysis?.solarBuildingModels)
    ? analysis.solarBuildingModels
    : [];

  const estimatedRoofs = [];

  buildings.forEach((building) => {
    const roofSelectionModel = getRoofSelectionModel(building);

    if (roofSelectionModel?.summary?.selectableCapacityPanels) {
      const selectedSegments =
        getRoofSelectionSegmentsForEstimate(roofSelectionModel);

      const targetPanels = getCalculationTargetPanels(roofSelectionModel);

      const allocations = distributePanelsAcrossRoofSelectionSegments({
        segments: selectedSegments,
        targetPanels,
      });

      allocations.forEach((allocation, allocationIndex) => {
        const segment = allocation.segment;
        const orientation = azimuthToCompass(segment?.azimuthDegrees);
        const tilt = numberOrNull(segment?.pitchDegrees);

        estimatedRoofs.push({
          id: makeCalculationRoofId(building.id, allocationIndex),
          source: "google_solar_api_roof_selection_model_estimate",
          sourceBuildingId: building.id || null,
          sourceTargetLabel: building.targetLabel || null,
          sourceSegmentId: segment.segmentId || segment.id || null,
          sourceSegmentIndex: segment.segmentIndex ?? null,

          orientation: orientation === "Unknown" ? "S" : orientation,
          tilt: tilt === null ? 40 : Math.round(tilt),
          shading: inferLegacyShadingFromRoofSelectionSegment(segment),
          panels: allocation.panels,

          aiModelNotes: {
            provider: "google_solar_api",
            diagnosticOnly: true,
            sourceModel: roofSelectionModel.source || null,
            defaultSelectionMode:
              roofSelectionModel?.summary?.defaultSelectionMode || null,
            suggestedPanelRange: roofSelectionModel?.suggestedPanelRange || null,
            editablePanelRange: roofSelectionModel?.editablePanelRange || null,
            targetPanels,
            segmentSelectionStatus: segment.selectionStatus || null,
            segmentMaxPanels: segment.maxPanels ?? null,
            segmentAnnualKwhPerKwp: segment.annualKwhPerKwp ?? null,
            segmentAreaM2: segment?.areaM2 ?? null,
            segmentAzimuthDegrees: segment?.azimuthDegrees ?? null,
            segmentPitchDegrees: segment?.pitchDegrees ?? null,
          },
        });
      });

      return;
    }

    // Fallback for older backend responses without roofSelectionModel.
    const allSegments = Array.isArray(building?.roofSegments)
      ? building.roofSegments
      : [];

    const usableSegments = allSegments.filter(isLikelyUsableCalculationSegment);

    const segmentsForEstimate =
      usableSegments.length > 0
        ? usableSegments
        : allSegments.filter((segment) => {
            const areaM2 = numberOrNull(segment?.areaM2);
            return areaM2 !== null && areaM2 >= 8;
          });

    const allocations = distributePanelsAcrossSegments({
      building,
      segments: segmentsForEstimate,
    });

    allocations.forEach((allocation, allocationIndex) => {
      const segment = allocation.segment;
      const orientation = azimuthToCompass(segment?.azimuthDegrees);
      const tilt = numberOrNull(segment?.pitchDegrees);

      estimatedRoofs.push({
        id: makeCalculationRoofId(building.id, allocationIndex),
        source: "google_solar_api_editable_calculation_estimate",
        sourceBuildingId: building.id || null,
        sourceTargetLabel: building.targetLabel || null,
        sourceSegmentId: segment.id || null,

        orientation: orientation === "Unknown" ? "S" : orientation,
        tilt: tilt === null ? 40 : Math.round(tilt),
        shading: inferLegacyShadingFromSunshine(segment),
        panels: allocation.panels,

        aiModelNotes: {
          provider: "google_solar_api",
          diagnosticOnly: true,
          googleMaxPanels: building?.solarPotential?.maxArrayPanelsCount ?? null,
          segmentAreaM2: segment?.areaM2 ?? null,
          segmentAzimuthDegrees: segment?.azimuthDegrees ?? null,
          segmentPitchDegrees: segment?.pitchDegrees ?? null,
        },
      });
    });
  });

  return estimatedRoofs;
}

function getEstimatedRoofPanelTotal(estimatedRoofs) {
  return estimatedRoofs.reduce(
    (sum, roof) => sum + (numberOrNull(roof?.panels) || 0),
    0
  );
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
  onUseCalculationRoofEstimate,
  hasCalculationRoofs = false,
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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
      setShowTechnicalDetails(false);
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

  const editableRoofEstimates = solarApiAnalysis?.summary
    ? buildEditableRoofEstimatesFromSolarAnalysis(solarApiAnalysis)
    : [];

  const editableRoofPanelTotal = getEstimatedRoofPanelTotal(editableRoofEstimates);

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
        const buildings = Array.isArray(solarApiAnalysis.solarBuildingModels)
          ? solarApiAnalysis.solarBuildingModels
          : [];

        const primaryBuilding = buildings[0] || null;
        const roofSelectionModel = primaryBuilding?.roofSelectionModel || null;
        const modelSummary = roofSelectionModel?.summary || {};
        const suggestedRange = roofSelectionModel?.suggestedPanelRange || null;
        const totals = getAnalysisTotals(solarApiAnalysis);

        const confidenceLevel = String(
          modelSummary.confidenceLevel || "medium"
        ).toLowerCase();

        const confidenceLabel =
          confidenceLevel === "high"
            ? "High confidence"
            : confidenceLevel === "low"
              ? "Low confidence"
              : "Medium confidence";

        const selectedCapacity =
          modelSummary.defaultSelectedCapacityPanels ??
          modelSummary.recommendedCapacityPanels ??
          "—";

        const maxSelectable = modelSummary.selectableCapacityPanels ?? "—";

        const warnings = Array.isArray(roofSelectionModel?.warnings)
          ? roofSelectionModel.warnings
          : [];

        const roofModelTitle = roofSelectionModel
          ? getRoofSelectionTitle(roofSelectionModel)
          : "Roof areas need review";

        const roofModelDescription = roofSelectionModel
          ? getRoofSelectionDescription(roofSelectionModel)
          : "We found Google Solar roof data, but the roof-selection model was not returned by the backend.";

        return (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  AI roof estimate
                </p>

                <h4 className="mt-1 text-lg font-semibold text-slate-950">
                  {roofModelTitle}
                </h4>

                <p className="mt-1 max-w-2xl text-slate-600">
                  {roofModelDescription}
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {confidenceLabel}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested panels
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {suggestedRange?.expected ?? (editableRoofPanelTotal || "—")}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Likely range
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {suggestedRange
                    ? `${suggestedRange.low}–${suggestedRange.high}`
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Selected roof capacity
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {selectedCapacity}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Max selectable
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {maxSelectable}
                </p>
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                {warnings.slice(0, 3).map((warning) => (
                  <div
                    key={warning.code}
                    className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
                  >
                    {warning.message}
                  </div>
                ))}
              </div>
            )}

            {editableRoofEstimates.length > 0 && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
                <p className="font-semibold">
                  Create your editable roof estimate
                </p>

                <p className="mt-1 text-sm">
                  We can create {editableRoofEstimates.length} editable roof estimate
                  {editableRoofEstimates.length === 1 ? "" : "s"} with around{" "}
                  {editableRoofPanelTotal} total panel
                  {editableRoofPanelTotal === 1 ? "" : "s"}. You can still adjust
                  roof direction, pitch, shading and panel count before generating
                  the quote.
                </p>

                <button
                  type="button"
                  className="mt-3"
                  onClick={() => {
                    if (onUseCalculationRoofEstimate) {
                      onUseCalculationRoofEstimate(editableRoofEstimates);
                    }
                  }}
                >
                  {hasCalculationRoofs
                    ? "Replace current roof estimate"
                    : "Use this roof estimate"}
                </button>
              </div>
            )}

            <div className="mt-4 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="secondary-mini"
                onClick={() => setShowTechnicalDetails((value) => !value)}
              >
                {showTechnicalDetails
                  ? "Hide technical roof model details"
                  : "Show technical roof model details"}
              </button>
            </div>

            {showTechnicalDetails && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h5 className="font-semibold text-slate-950">
                  Technical Google Solar model details
                </h5>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Unique buildings
                    </p>
                    <p className="text-lg font-semibold">
                      {solarApiAnalysis.summary.uniqueBuildingsReturned}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Roof segments
                    </p>
                    <p className="text-lg font-semibold">{totals.roofSegments}</p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Google max panels
                    </p>
                    <p className="text-lg font-semibold">{totals.maxPanels}</p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Google array size
                    </p>
                    <p className="text-lg font-semibold">
                      {totals.googleArrayKw
                        ? `${totals.googleArrayKw.toFixed(1)} kWp`
                        : "Unknown"}
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

                {buildings.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {buildings.map((building) => {
                      const googleArrayKw = getGooglePanelPowerKw(building);
                      const roofSegments = Array.isArray(building.roofSegments)
                        ? building.roofSegments
                        : [];

                      const model = building.roofSelectionModel || null;

                      return (
                        <div
                          key={building.id}
                          className="rounded-lg border border-slate-200 bg-white p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {building.targetLabel || building.id}
                              </p>

                              <p className="mt-1 text-slate-600">
                                {building.postalCode || "Unknown postcode"} · Imagery{" "}
                                {building.imagery?.quality || "Unknown"}
                                {building.imagery?.date ? ` · ${building.imagery.date}` : ""}
                              </p>
                            </div>

                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              Diagnostic only
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Segments
                              </p>
                              <p className="font-semibold">
                                {building.roofSegmentCount ?? "Unknown"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Google max panels
                              </p>
                              <p className="font-semibold">
                                {building.solarPotential?.maxArrayPanelsCount ?? "Unknown"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Google array
                              </p>
                              <p className="font-semibold">
                                {googleArrayKw ? `${googleArrayKw.toFixed(1)} kWp` : "Unknown"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Array area
                              </p>
                              <p className="font-semibold">
                                {formatArea(building.solarPotential?.maxArrayAreaM2)}
                              </p>
                            </div>
                          </div>

                          {model && (
                            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">
                              <p className="font-semibold">
                                {getRoofSelectionTitle(model)}
                              </p>

                              <p className="mt-1 text-sm">
                                {getRoofSelectionDescription(model)}
                              </p>

                              <p className="mt-3 text-xs">
                                {model.summary?.recommendedSegmentCount || 0} recommended,{" "}
                                {model.summary?.optionalSegmentCount || 0} optional,{" "}
                                {model.summary?.hiddenSegmentCount || 0} hidden roof areas.
                              </p>
                            </div>
                          )}

                          {roofSegments.length > 0 && (
                            <div className="mt-4">
                              <p className="font-semibold">Detected roof segments</p>

                              <div className="mt-2 grid gap-2">
                                {roofSegments.slice(0, 6).map((segment, index) => (
                                  <div
                                    key={segment.id || index}
                                    className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4"
                                  >
                                    <div>
                                      <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Segment
                                      </p>
                                      <p className="font-semibold">{index + 1}</p>
                                    </div>

                                    <div>
                                      <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Direction
                                      </p>
                                      <p className="font-semibold">
                                        {azimuthToCompass(segment.azimuthDegrees)}{" "}
                                        <span className="font-normal">
                                          ({formatDegrees(segment.azimuthDegrees)})
                                        </span>
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Pitch
                                      </p>
                                      <p className="font-semibold">
                                        {formatDegrees(segment.pitchDegrees)}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Area
                                      </p>
                                      <p className="font-semibold">
                                        {formatArea(segment.areaM2)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {roofSegments.length > 6 && (
                                <p className="mt-2 text-xs text-slate-500">
                                  Showing first 6 of {roofSegments.length} detected segments.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="mt-4 text-xs text-slate-500">
                  Technical details are diagnostic only. Google panel counts use Google’s
                  assumptions, not Zion Energy’s final product catalogue, setbacks,
                  obstructions or installation design.
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
