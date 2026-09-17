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

function getRoofSelectionSegmentIdentity(segment) {
  return String(
    segment?.segmentIndex ??
      segment?.sourceSegmentIndex ??
      segment?.segmentId ??
      segment?.id ??
      ""
  );
}

function getRoofSelectionSegmentKey(building, segment) {
  return `${building?.id || building?.targetId || "building"}::${getRoofSelectionSegmentIdentity(segment)}`;
}

function getSelectableRoofSelectionSegments(model) {
  const seen = new Set();
  const segments = [];

  [
    ...(Array.isArray(model?.recommendedSegments) ? model.recommendedSegments : []),
    ...(Array.isArray(model?.optionalSegments) ? model.optionalSegments : []),
  ].forEach((segment) => {
    const key = getRoofSelectionSegmentIdentity(segment);

    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    segments.push(segment);
  });

  return segments;
}

function buildDefaultRoofSelectionSegmentKeys(analysis) {
  const buildings = Array.isArray(analysis?.solarBuildingModels)
    ? analysis.solarBuildingModels
    : [];

  const keys = [];

  buildings.forEach((building) => {
    const model = getRoofSelectionModel(building);

    const backendDefaultSegments = Array.isArray(
      model?.defaultSelectedSegments
    )
      ? model.defaultSelectedSegments
      : [];

    const recommendedSegments = Array.isArray(
      model?.recommendedSegments
    )
      ? model.recommendedSegments
      : [];

    const defaultSegments =
      backendDefaultSegments.length > 0
        ? backendDefaultSegments
        : recommendedSegments;

    defaultSegments.forEach((segment) => {
      const key = getRoofSelectionSegmentKey(building, segment);

      if (key && !keys.includes(key)) {
        keys.push(key);
      }
    });
  });

  return keys;
}

function getSelectedRoofSelectionSegments({
  building,
  model,
  selectedRoofSegmentKeySet,
}) {
  const selectableSegments = getSelectableRoofSelectionSegments(model);

  return selectableSegments.filter((segment) =>
    selectedRoofSegmentKeySet.has(
      getRoofSelectionSegmentKey(building, segment)
    )
  );
}

function getRoofSelectionCapacity(segments) {
  return (Array.isArray(segments) ? segments : []).reduce(
    (sum, segment) => sum + (numberOrNull(segment?.maxPanels) || 0),
    0
  );
}

function getCustomerRoofFacingLabel(segment) {
  const compass = azimuthToCompass(segment?.azimuthDegrees);

  const labels = {
    N: "North-facing",
    NE: "North-east-facing",
    E: "East-facing",
    SE: "South-east-facing",
    S: "South-facing",
    SW: "South-west-facing",
    W: "West-facing",
    NW: "North-west-facing",
  };

  return labels[compass] || "Roof area";
}

function getCustomerPotentialReason(segment) {
  const panels = numberOrNull(segment?.maxPanels) || 0;
  const orientation = String(segment?.orientationClass || "").toLowerCase();
  const sunshine = String(segment?.sunshineClass || "").toLowerCase();
  const annualKwhPerKwp = numberOrNull(segment?.annualKwhPerKwp);

  if (panels > 0 && panels < 4) {
    return "This is a smaller roof area, so it may be less practical once panel clearances and installation access are confirmed.";
  }

  if (orientation === "marginal_east_west") {
    return "This roof area could be usable, but its direction is less favourable than the areas we recommend automatically.";
  }

  if (sunshine === "medium") {
    return "This roof area could be usable, but it receives less sunlight than the areas we recommend automatically.";
  }

  if (annualKwhPerKwp !== null && annualKwhPerKwp < 800) {
    return "This roof area could add capacity, but its expected generation is lower than the areas we recommend automatically.";
  }

  return "This roof area could add capacity, but we would prefer to confirm its suitability during the final survey and design.";
}

function formatPanelAssumption(panelAssumption) {
  if (!panelAssumption) {
    return "Panel assumption unavailable";
  }

  const watts = panelAssumption.panelWatts
    ? `${panelAssumption.panelWatts}W`
    : "Unknown wattage";

  const dimensions =
    panelAssumption.widthMm && panelAssumption.heightMm
      ? `${panelAssumption.widthMm} × ${panelAssumption.heightMm}mm`
      : "Unknown dimensions";

  return `${panelAssumption.label || panelAssumption.key || "Panel assumption"} · ${watts} · ${dimensions}`;
}

function formatPanelCountMethod(method) {
  if (method === "google_capacity_area_adjusted") {
    return "Google Solar API roof capacity, area-adjusted to Zeyzer panel dimensions.";
  }

  if (!method) {
    return "Panel count method unavailable.";
  }

  return method;
}

function getCalculationTargetPanels(model, selectedSegments = null) {
  if (Array.isArray(selectedSegments)) {
    const selectedSegmentCapacity =
      getRoofSelectionCapacity(selectedSegments);

    if (!selectedSegmentCapacity) {
      return 0;
    }

    return Math.max(
      1,
      Math.round(selectedSegmentCapacity)
    );
  }

  const defaultSelectedCapacity = numberOrNull(
    model?.summary?.defaultSelectedCapacityPanels
  );

  const recommendedCapacity = numberOrNull(
    model?.summary?.recommendedCapacityPanels
  );

  const rawTarget =
    defaultSelectedCapacity ||
    recommendedCapacity ||
    0;

  if (!rawTarget) {
    return 0;
  }

  return Math.max(1, Math.round(rawTarget));
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

  // Potential roof areas require explicit customer selection.
  // Never promote one into the default system automatically.
  return [];
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

function buildEditableRoofEstimatesFromSolarAnalysis(
  analysis,
  { selectedRoofSegmentKeys = [] } = {}
) {
  const selectedRoofSegmentKeySet = new Set(selectedRoofSegmentKeys);
  const buildings = Array.isArray(analysis?.solarBuildingModels)
    ? analysis.solarBuildingModels
    : [];

  const estimatedRoofs = [];

  buildings.forEach((building) => {
    const roofSelectionModel = getRoofSelectionModel(building);

    if (roofSelectionModel) {
      const selectedSegments = getSelectedRoofSelectionSegments({
        building,
        model: roofSelectionModel,
        selectedRoofSegmentKeySet,
      });

      const targetPanels = getCalculationTargetPanels(
        roofSelectionModel,
        selectedSegments
      );

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

          // Rich AI roof data. The simple fields above keep the existing quote
          // flow working; these fields allow the backend to use exact Google
          // Solar pitch, azimuth, yield and panel-assumption data in a later phase.
          aiRoofData: {
            provider: "google_solar_api",
            sourceModel: roofSelectionModel.source || null,
            panelCountMethod:
              roofSelectionModel?.panelCountMethod ||
              roofSelectionModel?.summary?.panelCountMethod ||
              null,

            panelAssumption:
              segment.panelAssumption ||
              roofSelectionModel?.panelAssumption ||
              roofSelectionModel?.summary?.panelAssumption ||
              null,

            googlePanelAssumption:
              segment.googlePanelAssumption ||
              roofSelectionModel?.googlePanelAssumption ||
              roofSelectionModel?.summary?.googlePanelAssumption ||
              null,

            panelCountAdjustmentFactor:
              segment.panelCountAdjustmentFactor ||
              roofSelectionModel?.summary?.panelCountAdjustmentFactor ||
              null,

            targetPanels,
            allocatedPanels: allocation.panels,

            segmentId: segment.segmentId || segment.id || null,
            segmentIndex: segment.segmentIndex ?? null,
            segmentSelectionStatus: segment.selectionStatus || null,

            maxPanels: segment.maxPanels ?? null,
            googleMaxConfigPanels: segment.googleMaxConfigPanels ?? null,

            annualKwhPerKwp: segment.annualKwhPerKwp ?? null,
            maxConfigAnnualKwh: segment.maxConfigAnnualKwh ?? null,
            googleMaxConfigAnnualKwh: segment.googleMaxConfigAnnualKwh ?? null,

            areaM2: segment?.areaM2 ?? null,
            groundAreaM2: segment?.groundAreaM2 ?? null,
            azimuthDegrees: segment?.azimuthDegrees ?? null,
            pitchDegrees: segment?.pitchDegrees ?? null,

            orientationClass: segment.orientationClass || null,
            sunshineClass: segment.sunshineClass || null,
            medianSunshineHours: segment.medianSunshineHours ?? null,
            lowSunshineHours: segment.lowSunshineHours ?? null,
          },

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

const ATTACHED_PROPERTY_TYPES = new Set([
  "semi_detached",
  "mid_terrace",
  "end_terrace",
]);

function requiresPropertyBoundary(propertyType) {
  return ATTACHED_PROPERTY_TYPES.has(String(propertyType || "").toLowerCase());
}

function getBoundaryLineCount(propertyType) {
  return String(propertyType || "").toLowerCase() === "mid_terrace" ? 2 : 1;
}

function getPropertyTypeLabel(propertyType) {
  const labels = {
    semi_detached: "semi-detached",
    mid_terrace: "mid-terrace",
    end_terrace: "end-terrace",
  };

  return labels[String(propertyType || "").toLowerCase()] || "attached";
}

function getBoundaryInstruction(propertyType) {
  const normalised = String(propertyType || "").toLowerCase();

  if (normalised === "mid_terrace") {
    return "Click two points for the left boundary, then two points for the right boundary.";
  }

  if (normalised === "end_terrace") {
    return "Click two points along the boundary between your home and the attached neighbour.";
  }

  return "Click two points along the boundary between your home and the attached neighbour.";
}

function buildPropertyBoundaryFromPoints(points, propertyType) {
  const requiredLines = getBoundaryLineCount(propertyType);
  const requiredPoints = requiredLines * 2;
  const usablePoints = points.slice(0, requiredPoints);

  if (usablePoints.length < requiredPoints) {
    return null;
  }

  const boundaryLines = [];

  for (let i = 0; i < usablePoints.length; i += 2) {
    boundaryLines.push([usablePoints[i], usablePoints[i + 1]]);
  }

  return {
    source: "user_drawn_on_google_map",
    propertyType: propertyType || "unknown",
    geometryType:
      requiredLines === 2 ? "two_boundary_lines" : "single_boundary_line",
    boundaryLines,
    boundaryPointCount: usablePoints.length,
    createdAt: new Date().toISOString(),
    filteringStatus: "captured_not_applied",
  };
}

function buildSelectedRoofSegmentKeysFromCalculationRoofs(
  analysis,
  calculationRoofs
) {
  const roofs = Array.isArray(calculationRoofs)
    ? calculationRoofs
    : [];

  const buildings = Array.isArray(analysis?.solarBuildingModels)
    ? analysis.solarBuildingModels
    : [];

  if (!roofs.length || !buildings.length) {
    return [];
  }

  const keys = [];

  roofs.forEach((roof) => {
    const sourceBuildingId =
      roof?.sourceBuildingId ?? null;

    const building =
      buildings.find((candidate) => {
        const candidateId =
          candidate?.id ??
          candidate?.targetId ??
          null;

        return (
          sourceBuildingId !== null &&
          candidateId !== null &&
          String(candidateId) === String(sourceBuildingId)
        );
      }) ||
      (buildings.length === 1 ? buildings[0] : null);

    if (!building) {
      return;
    }

    const model = getRoofSelectionModel(building);
    const selectableSegments =
      getSelectableRoofSelectionSegments(model);

    const sourceSegmentIndex =
      roof?.sourceSegmentIndex ??
      roof?.aiRoofData?.segmentIndex ??
      null;

    const sourceSegmentId =
      roof?.sourceSegmentId ??
      roof?.aiRoofData?.segmentId ??
      null;

    const segment = selectableSegments.find((candidate) => {
      const candidateIndex =
        candidate?.segmentIndex ??
        candidate?.sourceSegmentIndex ??
        null;

      const candidateId =
        candidate?.segmentId ??
        candidate?.id ??
        null;

      if (
        sourceSegmentIndex !== null &&
        candidateIndex !== null &&
        String(candidateIndex) === String(sourceSegmentIndex)
      ) {
        return true;
      }

      return (
        sourceSegmentId !== null &&
        candidateId !== null &&
        String(candidateId) === String(sourceSegmentId)
      );
    });

    if (!segment) {
      return;
    }

    const key =
      getRoofSelectionSegmentKey(building, segment);

    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  });

  return keys;
}

export default function SolarTargetBuildingSelector({
  selectedAddress,
  propertyType = "unknown",
  addressContext,
  value,
  onChange,
  onUseCalculationRoofEstimate,
  hasCalculationRoofs = false,
  calculationRoofs = [],
  initialZoom = 20,
}) {
  const mapContainerRef = useRef(null);
  const googleRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const boundaryMarkersRef = useRef([]);
  const boundaryPolylinesRef = useRef([]);
  const mapClickListenerRef = useRef(null);

  const selectedAddressRef = useRef(selectedAddress);
  const propertyTypeRef = useRef(propertyType || "unknown");
  const propertyBoundaryRef = useRef(value?.propertyBoundary || null);
  const boundaryPointsRef = useRef([]);
  const boundaryDrawingModeRef = useRef(false);
  const addressContextRef = useRef(addressContext);
  const onChangeRef = useRef(onChange);

  const [mapStatus, setMapStatus] = useState("Loading Google satellite map…");
  const [targetLabel, setTargetLabel] = useState("Main house");
  const [customLabel, setCustomLabel] = useState("");

  const [addingSecondaryBuilding, setAddingSecondaryBuilding] = useState(false);
  const [pendingSecondaryTarget, setPendingSecondaryTarget] = useState(null);

  const [solarTargetBuildings, setSolarTargetBuildings] = useState(
    Array.isArray(value?.solarTargetBuildings) ? value.solarTargetBuildings : []
  );

  const [solarApiAnalysis, setSolarApiAnalysis] = useState(
    value?.solarApiAnalysis || null
  );

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const restoredRoofSegmentKeys =
    buildSelectedRoofSegmentKeysFromCalculationRoofs(
      value?.solarApiAnalysis,
      calculationRoofs
    );

  const [selectedRoofSegmentKeys, setSelectedRoofSegmentKeys] = useState(
    () =>
      restoredRoofSegmentKeys.length > 0
        ? restoredRoofSegmentKeys
        : value?.solarApiAnalysis
          ? buildDefaultRoofSelectionSegmentKeys(value.solarApiAnalysis)
          : []
  );

  const [roofSelectionConfirmed, setRoofSelectionConfirmed] = useState(
    () =>
      hasCalculationRoofs &&
      restoredRoofSegmentKeys.length > 0
  );
  const [propertyBoundary, setPropertyBoundary] = useState(
    value?.propertyBoundary || null
  );
  const [boundaryPoints, setBoundaryPoints] = useState([]);
  const [boundaryDrawingMode, setBoundaryDrawingMode] = useState(false);

  const targetLabelRef = useRef(targetLabel);
  const customLabelRef = useRef(customLabel);
  const addingSecondaryBuildingRef = useRef(false);
  const pendingSecondaryTargetRef = useRef(null);
  const solarTargetBuildingsRef = useRef(solarTargetBuildings);
  const solarApiAnalysisRef = useRef(solarApiAnalysis);

  useEffect(() => {
    selectedAddressRef.current = selectedAddress;
  }, [selectedAddress]);

  useEffect(() => {
    propertyTypeRef.current = propertyType || "unknown";
  }, [propertyType]);

  useEffect(() => {
    propertyBoundaryRef.current = propertyBoundary;
  }, [propertyBoundary]);

  useEffect(() => {
    boundaryPointsRef.current = boundaryPoints;
  }, [boundaryPoints]);

  useEffect(() => {
    boundaryDrawingModeRef.current = boundaryDrawingMode;
  }, [boundaryDrawingMode]);

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

  function emitChange(
    nextTargets,
    nextAnalysis = solarApiAnalysisRef.current,
    nextPropertyBoundary = propertyBoundaryRef.current
  ) {
    const basePayload = buildSolarRoofGeometryPayload({
      selectedAddress: selectedAddressRef.current,
      addressContext: addressContextRef.current,
      solarTargetBuildings: nextTargets,
      solarApiAnalysis: nextAnalysis,
    });

    const payload = {
      ...basePayload,
      propertyType: propertyTypeRef.current || "unknown",
      propertyBoundary: nextPropertyBoundary || null,
    };

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

  function clearBoundaryOverlays() {
    boundaryMarkersRef.current.forEach((marker) => marker.setMap(null));
    boundaryPolylinesRef.current.forEach((polyline) => polyline.setMap(null));

    boundaryMarkersRef.current = [];
    boundaryPolylinesRef.current = [];
  }

  function renderBoundaryOverlay(boundary) {
    const google = googleRef.current;
    const map = mapRef.current;

    if (!google || !map) {
      return;
    }

    clearBoundaryOverlays();

    const lines = Array.isArray(boundary?.boundaryLines)
      ? boundary.boundaryLines
      : [];

    boundaryPolylinesRef.current = lines.map((line) => {
      return new google.maps.Polyline({
        map,
        path: line,
        strokeColor: "#f59e0b",
        strokeOpacity: 0.95,
        strokeWeight: 4,
        clickable: false,
      });
    });

    boundaryMarkersRef.current = lines.flatMap((line, lineIndex) => {
      return line.map((point, pointIndex) => {
        return new google.maps.Marker({
          map,
          position: point,
          label: String(lineIndex * 2 + pointIndex + 1),
          title: "Property boundary point",
        });
      });
    });
  }

  function resetPropertyBoundary({ keepDrawingMode = false } = {}) {
    propertyBoundaryRef.current = null;
    boundaryPointsRef.current = [];

    setPropertyBoundary(null);
    setBoundaryPoints([]);

    if (!keepDrawingMode) {
      boundaryDrawingModeRef.current = false;
      setBoundaryDrawingMode(false);
    }

    clearBoundaryOverlays();
  }

  function startBoundaryDrawing() {
    const currentPropertyType = propertyTypeRef.current || "unknown";

    if (!requiresPropertyBoundary(currentPropertyType)) {
      setMapStatus("Boundary drawing is only needed for semi-detached or terraced homes.");
      return;
    }

    resetPropertyBoundary({ keepDrawingMode: true });
    setSelectedRoofSegmentKeys([]);

    emitChange(
      solarTargetBuildingsRef.current,
      solarApiAnalysisRef.current,
      null
    );

    boundaryDrawingModeRef.current = true;
    setBoundaryDrawingMode(true);

    setMapStatus(
      `${getBoundaryInstruction(currentPropertyType)} Boundary drawing is active.`
    );
  }

  function cancelBoundaryDrawing() {
    resetPropertyBoundary();
    setSelectedRoofSegmentKeys([]);

    emitChange(
      solarTargetBuildingsRef.current,
      solarApiAnalysisRef.current,
      null
    );

    setMapStatus(
      "Boundary marking cancelled. Start again when you're ready."
    );
  }

  function addBoundaryPointFromMapClick(latLng) {
    if (!latLng) {
      return;
    }

    const currentPropertyType = propertyTypeRef.current || "unknown";
    const requiredLines = getBoundaryLineCount(currentPropertyType);
    const requiredPoints = requiredLines * 2;

    const nextPoint = {
      lat: roundCoordinate(latLng.lat()),
      lng: roundCoordinate(latLng.lng()),
    };

    const nextPoints = [...boundaryPointsRef.current, nextPoint].slice(
      0,
      requiredPoints
    );

    boundaryPointsRef.current = nextPoints;
    setBoundaryPoints(nextPoints);

    const nextBoundary = buildPropertyBoundaryFromPoints(
      nextPoints,
      currentPropertyType
    );

    if (nextBoundary) {
      propertyBoundaryRef.current = nextBoundary;
      boundaryDrawingModeRef.current = false;

      setPropertyBoundary(nextBoundary);
      setBoundaryDrawingMode(false);

      renderBoundaryOverlay(nextBoundary);

      emitChange(
        solarTargetBuildingsRef.current,
        solarApiAnalysisRef.current,
        nextBoundary
      );

      setMapStatus(
        "Boundary marked. Check the line on the map, then confirm it to continue."
      );

      return;
    }

    setMapStatus(
      `Boundary point ${nextPoints.length} of ${requiredPoints} added. ${getBoundaryInstruction(currentPropertyType)}`
    );
  }

  function confirmPropertyBoundary() {
    const currentBoundary =
      propertyBoundaryRef.current ||
      propertyBoundary ||
      null;

    if (!currentBoundary) {
      setMapStatus(
        "Mark the property boundary on the map before confirming."
      );
      return;
    }

    analyseTargets({
      propertyBoundaryOverride: currentBoundary,
    });
  }

  function handleMapClick(latLng) {
    if (boundaryDrawingModeRef.current) {
      addBoundaryPointFromMapClick(latLng);
      return;
    }

    addTargetFromMapClick(latLng);
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

    if (currentTargets.length > 0) {
      if (!addingSecondaryBuildingRef.current) {
        setMapStatus(
          "Your home is already selected."
        );
        return;
      }

      const nextSecondaryTarget = {
        id: makeTargetId(),
        label: "Garage / outbuilding",
        source: "user_clicked_google_map_secondary",
        latitude: roundCoordinate(latLng.lat()),
        longitude: roundCoordinate(latLng.lng()),
      };

      pendingSecondaryTargetRef.current = nextSecondaryTarget;
      setPendingSecondaryTarget(nextSecondaryTarget);

      renderMarkers([
        ...currentTargets,
        nextSecondaryTarget,
      ]);

      setMapStatus(
        "Additional building selected. Confirm it below to include it."
      );

      return;
    }

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
    setSelectedRoofSegmentKeys([]);
    resetPropertyBoundary();
    renderMarkers(nextTargets);
    emitChange(nextTargets, null);

    setMapStatus(
      `Home selected. Confirm it below to continue.`
    );

  }

  function startAddingSecondaryBuilding() {
    const currentPropertyType = String(
      propertyTypeRef.current ||
      propertyType ||
      ""
    ).toLowerCase();

    if (!["detached", "bungalow"].includes(currentPropertyType)) {
      setMapStatus(
        "Additional buildings are not available for this property type yet."
      );
      return;
    }

    addingSecondaryBuildingRef.current = true;
    pendingSecondaryTargetRef.current = null;

    setAddingSecondaryBuilding(true);
    setPendingSecondaryTarget(null);
    setAnalysisError("");

    renderMarkers(solarTargetBuildingsRef.current);

    setMapStatus(
      "Click the garage or outbuilding you would like us to include."
    );
  }

  function chooseSecondaryBuildingAgain() {
    pendingSecondaryTargetRef.current = null;
    setPendingSecondaryTarget(null);

    renderMarkers(solarTargetBuildingsRef.current);

    setMapStatus(
      "Click the garage or outbuilding you would like us to include."
    );
  }

  function cancelAddingSecondaryBuilding() {
    addingSecondaryBuildingRef.current = false;
    pendingSecondaryTargetRef.current = null;

    setAddingSecondaryBuilding(false);
    setPendingSecondaryTarget(null);
    setAnalysisError("");

    renderMarkers(solarTargetBuildingsRef.current);

    setMapStatus(
      "Home confirmed."
    );
  }

  async function confirmSecondaryBuilding() {
    const pendingTarget = pendingSecondaryTargetRef.current;

    if (!pendingTarget) {
      setMapStatus(
        "Click the garage or outbuilding on the map first."
      );
      return;
    }

    const currentTargets = Array.isArray(solarTargetBuildingsRef.current)
      ? solarTargetBuildingsRef.current
      : [];

    // V1 supports one optional additional building.
    const mainTarget = currentTargets[0];

    if (!mainTarget) {
      setMapStatus(
        "Your main home selection could not be found. Choose your home again."
      );
      return;
    }

    const nextTargets = [
      mainTarget,
      pendingTarget,
    ];

    const result = await analyseTargets({
      targetsOverride: nextTargets,
    });

    if (!result) {
      return;
    }

    solarTargetBuildingsRef.current = nextTargets;
    setSolarTargetBuildings(nextTargets);
    renderMarkers(nextTargets);

    addingSecondaryBuildingRef.current = false;
    pendingSecondaryTargetRef.current = null;

    setAddingSecondaryBuilding(false);
    setPendingSecondaryTarget(null);

    setMapStatus(
      "Additional building included in the roof assessment."
    );
  }

  async function removeSecondaryBuilding() {
    const currentTargets = Array.isArray(solarTargetBuildingsRef.current)
      ? solarTargetBuildingsRef.current
      : [];

    const mainTarget = currentTargets[0];

    if (!mainTarget || currentTargets.length <= 1) {
      return;
    }

    const nextTargets = [mainTarget];

    const result = await analyseTargets({
      targetsOverride: nextTargets,
    });

    if (!result) {
      return;
    }

    solarTargetBuildingsRef.current = nextTargets;
    setSolarTargetBuildings(nextTargets);
    renderMarkers(nextTargets);

    setMapStatus(
      "Additional building removed from the roof assessment."
    );
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
    setSelectedRoofSegmentKeys([]);
    resetPropertyBoundary();
    renderMarkers(nextTargets);
    emitChange(nextTargets, null);
  }

  function clearTargets() {
    solarTargetBuildingsRef.current = [];
    solarApiAnalysisRef.current = null;

    setSolarTargetBuildings([]);
    setSolarApiAnalysis(null);
    setAnalysisError("");
    setSelectedRoofSegmentKeys([]);
    resetPropertyBoundary();
    clearMarkers();

    targetLabelRef.current = "Main house";
    customLabelRef.current = "";
    setTargetLabel("Main house");
    setCustomLabel("");

    emitChange([], null);
    setMapStatus("Click your home on the satellite image.");
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
    setMapStatus("Map centred on your address. Click your home on the satellite image.");
  }

  async function analyseTargets(options = {}) {
    const currentTargets = Array.isArray(options?.targetsOverride)
      ? options.targetsOverride
      : Array.isArray(solarTargetBuildingsRef.current)
        ? solarTargetBuildingsRef.current
        : [];

    const currentPropertyType =
      propertyTypeRef.current ||
      propertyType ||
      "unknown";

    const currentPropertyBoundary =
      options?.propertyBoundaryOverride ||
      propertyBoundaryRef.current ||
      propertyBoundary ||
      null;

    console.log("Solar roof analysis request", {
      targetCount: currentTargets.length,
      propertyType: currentPropertyType,
      boundaryFilterRequested: !!currentPropertyBoundary,
      boundaryLineCount: currentPropertyBoundary?.boundaryLines?.length || 0,
    });

    if (!currentTargets.length) {
      setAnalysisError("Click your home on the satellite image first.");
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError("");

    setMapStatus(
      currentPropertyBoundary
        ? "Checking your roof using the boundary you marked…"
        : "Checking your roof…"
    );

    try {
      const result = await analyseSolarTargetBuildings({
        solarTargetBuildings: currentTargets,
        requiredQuality: "BASE",
        propertyType: currentPropertyType,
        propertyBoundary: currentPropertyBoundary,
      });

      console.log("Solar roof analysis response", {
        boundaryFilterApplied:
          result?.solarBuildingModels?.[0]?.propertyBoundaryFilter?.applied || false,
        propertyBoundaryFilter:
          result?.solarBuildingModels?.[0]?.propertyBoundaryFilter || null,
      });

      solarApiAnalysisRef.current = result;

      setSolarApiAnalysis(result);
      setShowTechnicalDetails(false);
        setSelectedRoofSegmentKeys(buildDefaultRoofSelectionSegmentKeys(result));
      setRoofSelectionConfirmed(false);

      if (currentPropertyBoundary) {
        propertyBoundaryRef.current = currentPropertyBoundary;
        setPropertyBoundary(currentPropertyBoundary);
        renderBoundaryOverlay(currentPropertyBoundary);
      } else {
        propertyBoundaryRef.current = null;
        setPropertyBoundary(null);
        clearBoundaryOverlays();
      }

      emitChange(currentTargets, result, currentPropertyBoundary);

      setMapStatus(
        currentPropertyBoundary
          ? "Roof check complete. Review the roof areas below."
          : result?.summary?.uniqueBuildingsReturned
            ? `Solar roof model found for ${result.summary.uniqueBuildingsReturned} unique building(s).`
            : "Analysis completed, but no unique roof models were returned."
      );

      return result;
    } catch (err) {
      console.warn("Solar roof target analysis failed:", err);
      setAnalysisError(
        err?.message || "Could not analyse the selected buildings."
      );
      setMapStatus("We could not check this roof right now. Please try again.");

      return null;
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
          handleMapClick(event.latLng);
        });

        if (solarTargetBuildings.length > 0) {
          renderMarkers(solarTargetBuildings);
        }

        if (propertyBoundaryRef.current) {
          renderBoundaryOverlay(propertyBoundaryRef.current);
        }

        setMapStatus(
          selectedAddressRef.current
            ? "Map centred on your address. Click your home on the satellite image."
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
    ? buildEditableRoofEstimatesFromSolarAnalysis(solarApiAnalysis, {
        selectedRoofSegmentKeys,
      })
    : [];

  const editableRoofPanelTotal = getEstimatedRoofPanelTotal(editableRoofEstimates);

  const boundaryRequired = requiresPropertyBoundary(propertyType);
  const boundaryLineCount = getBoundaryLineCount(propertyType);
  const boundaryRequiredPoints = boundaryLineCount * 2;
  const boundaryCaptured = !!propertyBoundary;
  const boundaryPropertyLabel = getPropertyTypeLabel(propertyType);

  const homeTargetSelected = solarTargetBuildings.length > 0;
  const homeAnalysisReady = Boolean(solarApiAnalysis?.summary);

  const boundaryFilterApplied =
    solarApiAnalysis?.solarBuildingModels?.[0]?.propertyBoundaryFilter?.applied === true;

  const homeSelectionComplete =
    homeAnalysisReady &&
    (!boundaryRequired || boundaryFilterApplied);

  const secondaryBuildingEligible = [
    "detached",
    "bungalow",
  ].includes(
    String(propertyType || "").toLowerCase()
  );

  const additionalBuildingCount = Math.max(
    solarTargetBuildings.length - 1,
    0
  );

  const analysedBuildings = Array.isArray(
    solarApiAnalysis?.solarBuildingModels
  )
    ? solarApiAnalysis.solarBuildingModels
    : [];

  const additionalBuildingModels =
    analysedBuildings.slice(1);

  const additionalBuildingUsableCount =
    additionalBuildingModels.filter((building) => {
      const model = getRoofSelectionModel(building);

      return (
        model &&
        getSelectableRoofSelectionSegments(model).length > 0
      );
    }).length;

  const additionalBuildingAvoidOnlyCount =
    additionalBuildingModels.filter((building) => {
      const model = getRoofSelectionModel(building);

      if (!model) {
        return false;
      }

      const selectableSegments =
        getSelectableRoofSelectionSegments(model);

      const avoidSegmentCount =
        numberOrNull(model?.summary?.avoidSegmentCount) ||
        (Array.isArray(model?.notRecommendedSegments)
          ? model.notRecommendedSegments.length
          : 0) +
        (Array.isArray(model?.hiddenSegments)
          ? model.hiddenSegments.length
          : 0);

      return (
        selectableSegments.length === 0 &&
        avoidSegmentCount > 0
      );
    }).length;

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
        {homeSelectionComplete ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white"
                >
                  ✓
                </span>
                Home confirmed
              </div>

              {selectedAddress?.fullAddress && (
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedAddress.fullAddress}
                </p>
              )}

              <p className="mt-1 text-sm text-slate-600">
                We&apos;ve checked the satellite roof data for this property.
              </p>

              {additionalBuildingCount > 0 && (
                <p
                  className={`mt-1 text-sm font-medium ${
                    additionalBuildingAvoidOnlyCount > 0
                      ? "text-amber-700"
                      : "text-emerald-800"
                  }`}
                >
                  {additionalBuildingAvoidOnlyCount > 0
                    ? "Additional building checked — no suitable roof areas found."
                    : additionalBuildingUsableCount > 0
                      ? `${additionalBuildingUsableCount} additional building${
                          additionalBuildingUsableCount === 1 ? "" : "s"
                        } checked and available below.`
                      : "Additional building checked."}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {secondaryBuildingEligible &&
                !addingSecondaryBuilding &&
                additionalBuildingCount === 0 && (
                  <button
                    type="button"
                    className="secondary-mini"
                    onClick={startAddingSecondaryBuilding}
                    disabled={analysisLoading}
                  >
                    + Add a garage or outbuilding
                  </button>
                )}

              {secondaryBuildingEligible &&
                !addingSecondaryBuilding &&
                additionalBuildingCount > 0 && (
                  <button
                    type="button"
                    className="secondary-mini"
                    onClick={removeSecondaryBuilding}
                    disabled={analysisLoading}
                  >
                    Remove added building
                  </button>
                )}

              <button
                type="button"
                className="secondary-mini"
                onClick={clearTargets}
                disabled={analysisLoading || addingSecondaryBuilding}
              >
                Choose a different home
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Your home
                </p>

                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {!homeTargetSelected
                    ? "Confirm your home"
                    : !homeAnalysisReady
                      ? "Is this your home?"
                      : boundaryRequired
                        ? "Mark your roof boundary"
                        : "Checking your roof"}
                </h3>
              </div>

              {selectedAddress?.fullAddress && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm sm:max-w-[52%] sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Address
                  </p>

                  <p className="mt-0.5 font-medium text-slate-900">
                    {selectedAddress.fullAddress}
                  </p>
                </div>
              )}
            </div>

            {!selectedAddress && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                Go back to Step 1 and select your address before continuing.
              </div>
            )}

            {homeTargetSelected && !homeAnalysisReady && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white"
                >
                  ✓
                </span>
                Home selected
              </div>
            )}

            {!(
              homeAnalysisReady &&
              boundaryRequired &&
              !boundaryFilterApplied
            ) && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  {!homeTargetSelected
                    ? "Click your home on the satellite image."
                    : !homeAnalysisReady
                      ? "Check the marker is on your home, then confirm below."
                      : mapStatus}
                </p>

                {selectedAddress?.fullAddress && (
                  <button
                    type="button"
                    className="secondary-mini shrink-0"
                    onClick={centreMapOnSelectedAddress}
                  >
                    Re-centre map
                  </button>
                )}
              </div>
            )}

          </>
        )}

        <div
          ref={mapContainerRef}
          className={`h-[460px] w-full overflow-hidden rounded-xl border border-slate-200 ${
            homeSelectionComplete && !addingSecondaryBuilding
              ? "hidden"
              : "mt-4"
          }`}
        />

        {addingSecondaryBuilding && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-900">
              Add a garage or outbuilding
            </p>

            {!pendingSecondaryTarget ? (
              <p className="mt-1 text-slate-600">
                Click the garage or outbuilding on the satellite image above.
              </p>
            ) : (
              <>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white"
                  >
                    ✓
                  </span>
                  Building selected
                </div>

                <p className="mt-2 text-slate-600">
                  Check the marker is on the garage or outbuilding you want
                  included, then confirm it.
                </p>
              </>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {pendingSecondaryTarget && (
                <button
                  type="button"
                  className="next-step-button"
                  onClick={confirmSecondaryBuilding}
                  disabled={analysisLoading}
                >
                  {analysisLoading
                    ? "Checking building…"
                    : "Include this building"}
                </button>
              )}

              {pendingSecondaryTarget && (
                <button
                  type="button"
                  className="secondary-mini"
                  onClick={chooseSecondaryBuildingAgain}
                  disabled={analysisLoading}
                >
                  Choose again
                </button>
              )}

              <button
                type="button"
                className="secondary-mini"
                onClick={cancelAddingSecondaryBuilding}
                disabled={analysisLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

            {homeAnalysisReady &&
              boundaryRequired &&
              !boundaryFilterApplied && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold text-slate-950">
                    Mark your roof boundary
                  </p>

                  {!boundaryDrawingMode && !boundaryCaptured && (
                    <>
                      <p className="mt-1 text-slate-600">
                        We need to separate your roof from the attached
                        neighbour before creating your solar layout.
                      </p>

                      <button
                        type="button"
                        className="next-step-button mt-3"
                        onClick={startBoundaryDrawing}
                        disabled={analysisLoading}
                      >
                        Start marking boundary
                      </button>
                    </>
                  )}

                  {boundaryDrawingMode && (
                    <>
                      <p className="mt-1 text-slate-600">
                        {getBoundaryInstruction(propertyType)}
                      </p>

                      <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                        {boundaryPoints.length} of {boundaryRequiredPoints} points selected
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="secondary-mini"
                          onClick={startBoundaryDrawing}
                        >
                          Start again
                        </button>

                        <button
                          type="button"
                          className="secondary-mini"
                          onClick={cancelBoundaryDrawing}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}

                  {boundaryCaptured && !boundaryDrawingMode && (
                    <>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        <span
                          aria-hidden="true"
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white"
                        >
                          ✓
                        </span>
                        Boundary marked
                      </div>

                      <p className="mt-2 text-slate-600">
                        Check the {boundaryLineCount === 1 ? "line" : "lines"} on
                        the map. If {boundaryLineCount === 1 ? "it follows" : "they follow"} the
                        boundary with your neighbour, confirm to continue.
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="next-step-button"
                          onClick={confirmPropertyBoundary}
                          disabled={analysisLoading}
                        >
                          {analysisLoading
                            ? "Checking boundary…"
                            : boundaryLineCount === 1
                              ? "Confirm boundary line"
                              : "Confirm boundary lines"}
                        </button>

                        <button
                          type="button"
                          className="secondary-mini"
                          onClick={startBoundaryDrawing}
                          disabled={analysisLoading}
                        >
                          Redraw
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

        {!homeSelectionComplete && (
          <div className="mt-4 flex flex-wrap gap-3">
            {homeTargetSelected && !homeAnalysisReady && (
              <button
                type="button"
                className="next-step-button"
                onClick={() => analyseTargets()}
                disabled={analysisLoading}
              >
                {analysisLoading
                  ? "Checking roof…"
                  : "Confirm this is my home"}
              </button>
            )}

            {homeTargetSelected && (
              <button
                type="button"
                className="secondary-mini"
                onClick={clearTargets}
                disabled={analysisLoading}
              >
                Choose again
              </button>
            )}
          </div>
        )}

        {analysisError && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            {analysisError}
          </div>
        )}
      </div>

      {homeSelectionComplete &&
        !addingSecondaryBuilding &&
        solarApiAnalysis?.summary &&
        (() => {
        const buildings = Array.isArray(
          solarApiAnalysis.solarBuildingModels
        )
          ? solarApiAnalysis.solarBuildingModels
          : [];

        const primaryBuilding = buildings[0] || null;

        const roofSelectionModel =
          primaryBuilding?.roofSelectionModel || null;

        const panelAssumption =
          roofSelectionModel?.panelAssumption ||
          roofSelectionModel?.summary?.panelAssumption ||
          null;

        const panelWatt =
          numberOrNull(panelAssumption?.panelWatts) || null;

        const selectedPanels =
          editableRoofPanelTotal;

        const selectedKwp =
          panelWatt && selectedPanels
            ? ((selectedPanels * panelWatt) / 1000).toFixed(1)
            : null;

        const confirmedPanels =
          getEstimatedRoofPanelTotal(
            Array.isArray(calculationRoofs)
              ? calculationRoofs
              : []
          );

        const confirmedKwp =
          panelWatt && confirmedPanels
            ? ((confirmedPanels * panelWatt) / 1000).toFixed(1)
            : null;

        const boundaryRequired =
          requiresPropertyBoundary(propertyType);

        const boundaryFilterApplied =
          primaryBuilding?.propertyBoundaryFilter?.applied === true;

        const layoutReady =
          !boundaryRequired || boundaryFilterApplied;

        const selectedRoofSegmentKeySet =
          new Set(selectedRoofSegmentKeys);

        function toggleRoofSelectionSegment(building, segment) {
          const key =
            getRoofSelectionSegmentKey(building, segment);

          if (!key) {
            return;
          }

          setSelectedRoofSegmentKeys((currentKeys) => {
            const nextSet = new Set(currentKeys);

            if (nextSet.has(key)) {
              if (nextSet.size <= 1) {
                return currentKeys;
              }

              nextSet.delete(key);
            } else {
              nextSet.add(key);
            }

            return Array.from(nextSet);
          });
        }

        if (roofSelectionConfirmed && hasCalculationRoofs) {
          const displayPanels =
            confirmedPanels || selectedPanels;

          const displayKwp =
            confirmedKwp || selectedKwp;

          return (
            <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    <span
                      aria-hidden="true"
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white"
                    >
                      ✓
                    </span>
                    Selection confirmed
                  </div>

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current selection
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {displayKwp
                      ? `${displayKwp} kWp`
                      : `${displayPanels} panels`}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {displayPanels} panel
                    {displayPanels === 1 ? "" : "s"} selected
                  </p>

                  <p className="mt-2 text-xs text-emerald-700">
                    This roof layout is locked in for your estimate.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-mini"
                  onClick={() =>
                    setRoofSelectionConfirmed(false)
                  }
                >
                  Adjust selection
                </button>
              </div>

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Exact panel positions and usable roof space will still be
                confirmed during the survey and final design.
              </p>
            </div>
          );
        }

        return (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Roof layout
              </p>

              <h4 className="mt-1 text-lg font-semibold text-slate-950">
                Choose the roof areas to include
              </h4>

              <p className="mt-1 text-sm text-slate-600">
                We&apos;ve selected the roof areas we&apos;d use as the starting point.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full bg-emerald-400"
                  />
                  Recommended
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full bg-amber-400"
                  />
                  Potential
                </span>
              </div>
            </div>

            {!layoutReady && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
                Confirm the property boundary above before using this layout.
              </div>
            )}

            <div className="mt-4 space-y-3">
              {buildings.map((building) => {
                const model =
                  building.roofSelectionModel || null;

                const selectableSegments =
                  getSelectableRoofSelectionSegments(model);

                if (!model) {
                  return null;
                }

                if (selectableSegments.length === 0) {
                  const avoidSegmentCount =
                    numberOrNull(
                      model?.summary?.avoidSegmentCount
                    ) ||
                    (Array.isArray(model?.notRecommendedSegments)
                      ? model.notRecommendedSegments.length
                      : 0) +
                    (Array.isArray(model?.hiddenSegments)
                      ? model.hiddenSegments.length
                      : 0);

                  return (
                    <div
                      key={building.id}
                      className="overflow-hidden rounded-xl border border-slate-200"
                    >
                      {buildings.length > 1 && (
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {building.targetLabel ||
                              building.label ||
                              "Building"}
                          </p>

                          <p className="text-xs text-slate-500">
                            {selectableSegments.length} roof area
                            {selectableSegments.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      )}

                      <div className="px-4 py-4">
                        <div className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          No suitable roof areas found
                        </div>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          {avoidSegmentCount > 0
                            ? "All detected roof areas on this building were classed as Avoid, so this building has not been included in your solar estimate."
                            : "We could not identify any Recommended or Potential roof areas on this building, so it has not been included in your solar estimate."}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={building.id}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    {buildings.length > 1 && (
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {building.targetLabel ||
                            building.label ||
                            "Building"}
                        </p>
                      </div>
                    )}

                    <div className="divide-y divide-slate-100">
                      {selectableSegments.map(
                        (segment, visibleIndex) => {
                          const key =
                            getRoofSelectionSegmentKey(
                              building,
                              segment
                            );

                          const status =
                            segment.selectionStatus ||
                            "optional";

                          const isRecommended =
                            status === "recommended";

                          const checked =
                            selectedRoofSegmentKeySet.has(
                              key
                            );

                          const roofAreaNumber =
                            visibleIndex + 1;

                          const previousSegment =
                            selectableSegments[visibleIndex - 1] || null;

                          const nextSegment =
                            selectableSegments[visibleIndex + 1] || null;

                          const previousSelected =
                            previousSegment
                              ? selectedRoofSegmentKeySet.has(
                                  getRoofSelectionSegmentKey(
                                    building,
                                    previousSegment
                                  )
                                )
                              : false;

                          const nextSelected =
                            nextSegment
                              ? selectedRoofSegmentKeySet.has(
                                  getRoofSelectionSegmentKey(
                                    building,
                                    nextSegment
                                  )
                                )
                              : false;

                          const previousIsRecommended =
                            previousSegment
                              ? (previousSegment.selectionStatus ||
                                  "optional") === "recommended"
                              : false;

                          const nextIsRecommended =
                            nextSegment
                              ? (nextSegment.selectionStatus ||
                                  "optional") === "recommended"
                              : false;

                          const joinsPrevious =
                            checked &&
                            previousSelected &&
                            previousIsRecommended === isRecommended;

                          const joinsNext =
                            checked &&
                            nextSelected &&
                            nextIsRecommended === isRecommended;

                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={checked}
                              aria-label={`${
                                isRecommended
                                  ? "Recommended"
                                  : "Potential"
                              } roof ${roofAreaNumber}, ${getCustomerRoofFacingLabel(
                                segment
                              )}, ${segment.maxPanels ?? "unknown"} panels`}
                              onMouseDown={(event) => {
                                // Keep mouse focus from looking like another
                                // selection state. Keyboard focus still works.
                                event.preventDefault();
                              }}
                              onClick={() =>
                                toggleRoofSelectionSegment(
                                  building,
                                  segment
                                )
                              }
                              className={`roof-selection-row ${
                                isRecommended
                                  ? "roof-selection-row--recommended"
                                  : "roof-selection-row--potential"
                              } ${
                                checked
                                  ? "roof-selection-row--selected"
                                  : ""
                              } ${
                                checked && !joinsPrevious
                                  ? "roof-selection-row--selected-start"
                                  : ""
                              } ${
                                checked && !joinsNext
                                  ? "roof-selection-row--selected-end"
                                  : ""
                              }`}
                            >
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                                <div className="min-w-0 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      isRecommended
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    Roof {roofAreaNumber}
                                  </span>

                                  <span
                                    aria-hidden="true"
                                    className="text-slate-300"
                                  >
                                    ·
                                  </span>

                                  <span className="text-sm text-slate-600">
                                    {getCustomerRoofFacingLabel(segment)}
                                  </span>
                                </div>

                                <span className="shrink-0 font-medium text-slate-900">
                                  {segment.maxPanels ?? "—"} panel
                                  {Number(segment.maxPanels) === 1 ? "" : "s"}
                                </span>
                              </div>

                              {!isRecommended && (
                                <p className="mt-1.5 text-xs leading-5 text-amber-800/80">
                                  {getCustomerPotentialReason(segment)}
                                </p>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {editableRoofEstimates.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current selection
                  </p>

                  <p className="mt-1 text-xl font-semibold text-slate-950">
                    {selectedKwp
                      ? `${selectedKwp} kWp`
                      : `${selectedPanels} panels`}
                  </p>

                  <p className="mt-0.5 text-sm text-slate-600">
                    {selectedPanels} panel
                    {selectedPanels === 1
                      ? ""
                      : "s"}{" "}
                    selected
                  </p>


                </div>

                <button
                  type="button"
                  className="next-step-button"
                  disabled={!layoutReady}
                  onClick={() => {
                    if (
                      layoutReady &&
                      onUseCalculationRoofEstimate
                    ) {
                      onUseCalculationRoofEstimate(
                        editableRoofEstimates
                      );
                      setRoofSelectionConfirmed(true);
                    }
                  }}
                >
                  Confirm selected layout
                </button>
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              This is an initial satellite-based estimate. Final panel
              positions, clearances and usable roof space will be confirmed
              during the survey and final design.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
