import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import {
  buildRoofGeometryPayload,
  buildRoofPlaneFromFeature,
  validateRoofGeometryPayload,
} from "../../utils/roofGeometryPayload";

const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const SHADING_OPTIONS = [
  { value: "none", label: "None / very little" },
  { value: "some", label: "Some shading" },
  { value: "heavy", label: "Heavy shading" },
];

async function geocodePostcodeToLngLat({ postcode, token }) {
  const cleanPostcode = String(postcode || "").trim();

  if (!cleanPostcode || !token) {
    return null;
  }

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${encodeURIComponent(cleanPostcode)}.json` +
    `?country=gb&types=postcode,address&limit=1` +
    `&access_token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const center = data?.features?.[0]?.center;

    if (
      Array.isArray(center) &&
      center.length >= 2 &&
      Number.isFinite(Number(center[0])) &&
      Number.isFinite(Number(center[1]))
    ) {
      return [Number(center[0]), Number(center[1])];
    }

    return null;
  } catch (err) {
    console.warn("Failed to geocode postcode for roof map:", err);
    return null;
  }
}

export default function DrawMyRoofMap({
  postcode,
  addressContext,
  initialCenter = [-0.5704, 51.2362],
  initialZoom = 19,
  value,
  onChange,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  const onChangeRef = useRef(onChange);
  const postcodeRef = useRef(postcode);
  const addressContextRef = useRef(addressContext);
  const roofPlaneDetailsRef = useRef({});
  const suppressSyncRef = useRef(false);

  const [roofPlaneDetails, setRoofPlaneDetails] = useState({});
  const [roofPlanes, setRoofPlanes] = useState(value?.roofPlanes || []);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    postcodeRef.current = postcode;
  }, [postcode]);

  useEffect(() => {
    addressContextRef.current = addressContext;
  }, [addressContext]);

  useEffect(() => {
    roofPlaneDetailsRef.current = roofPlaneDetails;
  }, [roofPlaneDetails]);

  function buildAddressContext() {
    return (
      addressContextRef.current || {
        postcode: postcodeRef.current || null,
        country: "GB",
      }
    );
  }

  function syncRoofPlanes() {
    if (suppressSyncRef.current) {
      return;
    }

    const draw = drawRef.current;
    if (!draw) return;

    const data = draw.getAll();
    const features = data?.features || [];
    const currentDetails = roofPlaneDetailsRef.current || {};

    const nextRoofPlanes = features.map((feature, index) => {
      const featureId = feature.id || `feature-${index + 1}`;
      const details = currentDetails[featureId] || {};

      return buildRoofPlaneFromFeature({
        feature,
        index,
        details: {
          ...details,
          id: details.id || `drawn-roof-${index + 1}`,
          label: details.label || `Roof ${index + 1}`,
        },
      });
    });

    const payload = buildRoofGeometryPayload({
      roofPlanes: nextRoofPlanes,
      addressContext: buildAddressContext(),
    });

    setRoofPlanes(nextRoofPlanes);
    setErrors(validateRoofGeometryPayload(payload));

    if (onChangeRef.current) {
      onChangeRef.current(payload);
    }
  }

  useEffect(() => {
    const token = process.env.REACT_APP_MAPBOX_TOKEN;

    if (!token || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: initialCenter,
      zoom: initialZoom,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "draw_polygon",
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(draw, "top-left");

    map.on("draw.create", syncRoofPlanes);
    map.on("draw.update", syncRoofPlanes);
    map.on("draw.delete", syncRoofPlanes);

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.off("draw.create", syncRoofPlanes);
      map.off("draw.update", syncRoofPlanes);
      map.off("draw.delete", syncRoofPlanes);
      map.remove();

      mapRef.current = null;
      drawRef.current = null;
    };

    // Initialise the map once. Changing form fields should not recreate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const token = process.env.REACT_APP_MAPBOX_TOKEN;
    const currentPostcode = String(postcode || "").trim();

    if (!map || !token || !currentPostcode) {
      return;
    }

    let cancelled = false;

    async function centreMapOnPostcode() {
      const center = await geocodePostcodeToLngLat({
        postcode: currentPostcode,
        token,
      });

      if (cancelled || !center || !mapRef.current) {
        return;
      }

      mapRef.current.flyTo({
        center,
        zoom: 20,
        essential: true,
      });
    }

    centreMapOnPostcode();

    return () => {
      cancelled = true;
    };
  }, [postcode]);

  useEffect(() => {
    const shouldClear =
      !value ||
      !Array.isArray(value.roofPlanes) ||
      value.roofPlanes.length === 0;

    if (!shouldClear) {
      return;
    }

    suppressSyncRef.current = true;

    try {
      if (drawRef.current) {
        drawRef.current.deleteAll();
      }
    } catch (err) {
      console.warn("Failed to clear roof drawing:", err);
    }

    roofPlaneDetailsRef.current = {};
    setRoofPlaneDetails({});
    setRoofPlanes([]);
    setErrors([]);

    window.setTimeout(() => {
      suppressSyncRef.current = false;
    }, 0);
  }, [value]);

  function updateRoofPlaneDetail(index, key, nextValue) {
    const draw = drawRef.current;
    if (!draw) return;

    const features = draw.getAll()?.features || [];
    const feature = features[index];
    if (!feature) return;

    const featureId = feature.id || `feature-${index + 1}`;

    const nextDetails = {
      ...roofPlaneDetailsRef.current,
      [featureId]: {
        ...(roofPlaneDetailsRef.current[featureId] || {}),
        [key]: nextValue,
      },
    };

    roofPlaneDetailsRef.current = nextDetails;
    setRoofPlaneDetails(nextDetails);

    const nextRoofPlanes = features.map((item, itemIndex) => {
      const itemId = item.id || `feature-${itemIndex + 1}`;
      const details = nextDetails[itemId] || {};

      return buildRoofPlaneFromFeature({
        feature: item,
        index: itemIndex,
        details: {
          ...details,
          id: details.id || `drawn-roof-${itemIndex + 1}`,
          label: details.label || `Roof ${itemIndex + 1}`,
        },
      });
    });

    const payload = buildRoofGeometryPayload({
      roofPlanes: nextRoofPlanes,
      addressContext: buildAddressContext(),
    });

    setRoofPlanes(nextRoofPlanes);
    setErrors(validateRoofGeometryPayload(payload));

    if (onChangeRef.current) {
      onChangeRef.current(payload);
    }
  }

  if (!process.env.REACT_APP_MAPBOX_TOKEN) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Mapbox token missing. Add <code>REACT_APP_MAPBOX_TOKEN</code> to{" "}
        <code>.env.local</code> and restart the frontend.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Draw your usable roof area
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          Draw the roof area you would like us to assess. This improves the
          roof-size estimate, but the final panel layout and quantity still need
          to be confirmed by survey.
        </p>

        <div
          ref={mapContainerRef}
          className="mt-4 h-[420px] w-full overflow-hidden rounded-xl border border-slate-200"
        />
      </div>

      {roofPlanes.length > 0 && (
        <div className="space-y-3">
          {roofPlanes.map((plane, index) => (
            <div
              key={plane.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {plane.label}
                  </h4>
                  <p className="text-sm text-slate-600">
                    Approx area:{" "}
                    {plane.areaM2 ? `${plane.areaM2} m²` : "Unknown"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="text-sm">
                  <span className="block font-medium text-slate-700">
                    Orientation
                  </span>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                    value={plane.orientation || "unknown"}
                    onChange={(event) =>
                      updateRoofPlaneDetail(
                        index,
                        "orientation",
                        event.target.value
                      )
                    }
                  >
                    <option value="unknown">Select</option>
                    {ORIENTATIONS.map((orientation) => (
                      <option key={orientation} value={orientation}>
                        {orientation}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <span className="block font-medium text-slate-700">
                    Pitch / tilt
                  </span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                    type="number"
                    min="0"
                    max="70"
                    placeholder="40"
                    value={plane.tilt ?? ""}
                    onChange={(event) =>
                      updateRoofPlaneDetail(index, "tilt", event.target.value)
                    }
                  />
                </label>

                <label className="text-sm">
                  <span className="block font-medium text-slate-700">
                    Shading
                  </span>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                    value={plane.shading || "unknown"}
                    onChange={(event) =>
                      updateRoofPlaneDetail(index, "shading", event.target.value)
                    }
                  >
                    <option value="unknown">Select</option>
                    {SHADING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Before continuing:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {value?.roofPlanes?.length > 0 && errors.length === 0 && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          Roof drawing saved for this estimate. Final panel layout still needs
          survey/design confirmation.
        </div>
      )}
    </div>
  );
}