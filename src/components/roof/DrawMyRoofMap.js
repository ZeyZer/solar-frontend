import React, { useEffect, useRef, useState } from "react";

import {
  setOptions,
  importLibrary,
} from "@googlemaps/js-api-loader";

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

const DEFAULT_CENTER = {
  lat: 51.2362,
  lng: -0.5704,
};

function normaliseText(value) {
  return String(value || "").trim();
}

function buildInitialAddressSearch({ postcode, addressContext }) {
  const addressLine = normaliseText(addressContext?.addressLine);
  const cleanPostcode = normaliseText(postcode || addressContext?.postcode);

  if (addressLine && cleanPostcode && !addressLine.includes(cleanPostcode)) {
    return `${addressLine}, ${cleanPostcode}`;
  }

  return addressLine || cleanPostcode || "";
}

function pointsToCoordinates(points) {
  return points.map((point) => [Number(point.lng), Number(point.lat)]);
}

function coordinatesToPoints(coordinates) {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .map(([lng, lat]) => ({
      lat: Number(lat),
      lng: Number(lng),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng)
    );
}

function makeGeoJsonFeatureFromCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 3) {
    return null;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  const isClosed =
    Array.isArray(first) &&
    Array.isArray(last) &&
    Number(first[0]) === Number(last[0]) &&
    Number(first[1]) === Number(last[1]);

  const closedCoordinates = isClosed
    ? coordinates
    : [...coordinates, coordinates[0]];

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [closedCoordinates],
    },
  };
}

export default function DrawMyRoofMap({
  postcode,
  addressContext,
  initialCenter = [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
  initialZoom = 20,
  value,
  onChange,
}) {
  const mapContainerRef = useRef(null);

  const googleRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);

  const onChangeRef = useRef(onChange);
  const postcodeRef = useRef(postcode);
  const addressContextRef = useRef(addressContext);

  const currentPathRef = useRef([]);
  const roofPlanesRef = useRef(value?.roofPlanes || []);

  const draftPolylineRef = useRef(null);
  const draftPolygonRef = useRef(null);
  const savedPolygonsRef = useRef([]);

  const [addressSearch, setAddressSearch] = useState(() =>
    buildInitialAddressSearch({ postcode, addressContext })
  );

  const [mapStatus, setMapStatus] = useState("Loading Google satellite map…");
  const [currentPath, setCurrentPath] = useState([]);
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
    const nextAddressSearch = buildInitialAddressSearch({
      postcode,
      addressContext,
    });

    if (nextAddressSearch && roofPlanesRef.current.length === 0) {
      setAddressSearch(nextAddressSearch);
    }
  }, [postcode, addressContext?.addressLine, addressContext?.postcode]);

  function buildAddressContext() {
    return (
      addressContextRef.current || {
        postcode: postcodeRef.current || null,
        country: "GB",
      }
    );
  }

  function buildPayload(nextRoofPlanes) {
    return buildRoofGeometryPayload({
      roofPlanes: nextRoofPlanes,
      addressContext: {
        ...buildAddressContext(),
        addressSearchUsed: addressSearch,
        mapProvider: "google_maps",
        mapType: "hybrid",
      },
    });
  }

  function emitRoofGeometry(nextRoofPlanes) {
    roofPlanesRef.current = nextRoofPlanes;
    setRoofPlanes(nextRoofPlanes);

    const payload = buildPayload(nextRoofPlanes);
    setErrors(validateRoofGeometryPayload(payload));

    if (onChangeRef.current) {
      onChangeRef.current(payload);
    }
  }

  function clearDraftShape() {
    currentPathRef.current = [];
    setCurrentPath([]);

    if (draftPolylineRef.current) {
      draftPolylineRef.current.setMap(null);
    }

    if (draftPolygonRef.current) {
      draftPolygonRef.current.setMap(null);
    }
  }

  function renderDraftPath(nextPath) {
    const google = googleRef.current;
    const map = mapRef.current;

    if (!google || !map) {
      return;
    }

    if (!draftPolylineRef.current) {
      draftPolylineRef.current = new google.maps.Polyline({
        map,
        path: [],
        strokeWeight: 3,
        clickable: false,
      });
    }

    if (!draftPolygonRef.current) {
      draftPolygonRef.current = new google.maps.Polygon({
        map,
        paths: [],
        strokeWeight: 3,
        fillOpacity: 0.25,
        clickable: false,
      });
    }

    if (nextPath.length >= 3) {
      draftPolylineRef.current.setMap(null);
      draftPolygonRef.current.setMap(map);
      draftPolygonRef.current.setPath(nextPath);
    } else {
      draftPolygonRef.current.setMap(null);
      draftPolylineRef.current.setMap(map);
      draftPolylineRef.current.setPath(nextPath);
    }
  }

  function addMapPoint(latLng) {
    if (!latLng) {
      return;
    }

    const nextPoint = {
      lat: latLng.lat(),
      lng: latLng.lng(),
    };

    const nextPath = [...currentPathRef.current, nextPoint];

    currentPathRef.current = nextPath;
    setCurrentPath(nextPath);
    renderDraftPath(nextPath);
    setMapStatus(
      nextPath.length < 3
        ? `Point ${nextPath.length} added. Add at least ${3 - nextPath.length} more.`
        : "Roof outline ready. Click “Save roof area” when the outline looks right."
    );
  }

  function createSavedPolygon(points) {
    const google = googleRef.current;
    const map = mapRef.current;

    if (!google || !map || points.length < 3) {
      return null;
    }

    const polygon = new google.maps.Polygon({
      map,
      paths: points,
      strokeWeight: 3,
      fillOpacity: 0.25,
      clickable: false,
    });

    savedPolygonsRef.current = [...savedPolygonsRef.current, polygon];

    return polygon;
  }

  function redrawSavedPolygonsFromPlanes(planes) {
    savedPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    savedPolygonsRef.current = [];

    planes.forEach((plane) => {
      const points = coordinatesToPoints(plane.coordinates);
      if (points.length >= 3) {
        createSavedPolygon(points);
      }
    });
  }

  function saveCurrentRoofArea() {
    const points = currentPathRef.current;

    if (!Array.isArray(points) || points.length < 3) {
      setMapStatus("Draw at least three roof corners before saving this roof area.");
      return;
    }

    const coordinates = pointsToCoordinates(points);
    const feature = makeGeoJsonFeatureFromCoordinates(coordinates);

    if (!feature) {
      setMapStatus("The roof outline could not be saved. Please redraw it.");
      return;
    }

    const nextIndex = roofPlanesRef.current.length;

    const nextPlane = buildRoofPlaneFromFeature({
      feature,
      index: nextIndex,
      details: {
        id: `drawn-roof-${nextIndex + 1}`,
        label: `Roof ${nextIndex + 1}`,
      },
    });

    createSavedPolygon(points);
    clearDraftShape();

    const nextRoofPlanes = [...roofPlanesRef.current, nextPlane];

    emitRoofGeometry(nextRoofPlanes);
    setMapStatus("Roof area saved. Add orientation, pitch and shading below.");
  }

  function undoLastPoint() {
    const nextPath = currentPathRef.current.slice(0, -1);

    currentPathRef.current = nextPath;
    setCurrentPath(nextPath);
    renderDraftPath(nextPath);

    setMapStatus(
      nextPath.length === 0
        ? "Click around the roof corners to start drawing."
        : `${nextPath.length} point${nextPath.length === 1 ? "" : "s"} in current outline.`
    );
  }

  function removeRoofPlane(indexToRemove) {
    const polygon = savedPolygonsRef.current[indexToRemove];

    if (polygon) {
      polygon.setMap(null);
    }

    savedPolygonsRef.current = savedPolygonsRef.current.filter(
      (_, index) => index !== indexToRemove
    );

    const nextRoofPlanes = roofPlanesRef.current.filter(
      (_, index) => index !== indexToRemove
    );

    emitRoofGeometry(nextRoofPlanes);
    setMapStatus("Roof area removed.");
  }

  function updateRoofPlaneDetail(index, key, nextValue) {
    const nextRoofPlanes = roofPlanesRef.current.map((plane, planeIndex) => {
      if (planeIndex !== index) {
        return plane;
      }

      return {
        ...plane,
        [key]:
          key === "tilt"
            ? nextValue === ""
              ? null
              : Number(nextValue)
            : nextValue,
      };
    });

    emitRoofGeometry(nextRoofPlanes);
  }

  function clearAllRoofDrawing({ notifyParent = true } = {}) {
    clearDraftShape();

    savedPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    savedPolygonsRef.current = [];

    roofPlanesRef.current = [];
    setRoofPlanes([]);
    setErrors([]);
    setMapStatus("Roof drawing cleared. Click around the roof corners to start again.");

    if (notifyParent && onChangeRef.current) {
      onChangeRef.current(null);
    }
  }

  async function centreMapOnAddress(searchText = addressSearch) {
    const google = googleRef.current;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;

    const cleanSearchText = normaliseText(searchText);

    if (!google || !map || !geocoder || !cleanSearchText) {
      return;
    }

    setMapStatus(`Finding ${cleanSearchText}…`);

    try {
      const response = await geocoder.geocode({
        address: `${cleanSearchText}, United Kingdom`,
        componentRestrictions: {
          country: "GB",
        },
      });

      const result = response?.results?.[0];
      const location = result?.geometry?.location;

      if (!location) {
        setMapStatus("Could not find that address. Try entering the full street address.");
        return;
      }

      if (result.geometry.viewport) {
        map.fitBounds(result.geometry.viewport);
      }

      map.setCenter(location);
      map.setZoom(initialZoom);

      setMapStatus(
        "Map centred. Click around the roof corners, then save the roof area."
      );
    } catch (err) {
      console.warn("Failed to geocode address for roof map:", err);
      setMapStatus("Could not find that address. Try entering the full street address.");
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
        setOptions({
          key: apiKey,
          version: "weekly",
        });

        const mapsLibrary = await importLibrary("maps");
        const geocodingLibrary = await importLibrary("geocoding");

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const google = window.google;

        if (!google?.maps) {
          throw new Error("Google Maps namespace was not available after importLibrary().");
        }

        const [lng, lat] = Array.isArray(initialCenter)
          ? initialCenter
          : [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];

        const map = new mapsLibrary.Map(mapContainerRef.current, {
          center: {
            lat: Number(lat) || DEFAULT_CENTER.lat,
            lng: Number(lng) || DEFAULT_CENTER.lng,
          },
          zoom: initialZoom,
          mapTypeId: "hybrid",
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          rotateControl: false,
          tilt: 0,
        });

        const geocoder = new geocodingLibrary.Geocoder();

        googleRef.current = google;
        mapRef.current = map;
        geocoderRef.current = geocoder;

        map.addListener("click", (event) => {
          addMapPoint(event.latLng);
        });

        if (roofPlanesRef.current.length > 0) {
          redrawSavedPolygonsFromPlanes(roofPlanesRef.current);
        }

        setMapStatus("Map loaded. Finding the address…");

        const initialSearch = buildInitialAddressSearch({
          postcode: postcodeRef.current,
          addressContext: addressContextRef.current,
        });

        if (initialSearch) {
          setAddressSearch(initialSearch);
          await centreMapOnAddress(initialSearch);
        } else {
          setMapStatus("Map loaded. Click around the roof corners to start drawing.");
        }
      } catch (err) {
        console.error("Failed to load Google Maps roof drawing map:", err);

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

      clearDraftShape();

      savedPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      savedPolygonsRef.current = [];

      mapRef.current = null;
      geocoderRef.current = null;
      googleRef.current = null;
    };

    // Initialise the map once. Form changes should not recreate the Google map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const shouldClear =
      !value ||
      !Array.isArray(value.roofPlanes) ||
      value.roofPlanes.length === 0;

    if (shouldClear && roofPlanesRef.current.length > 0) {
      clearAllRoofDrawing({ notifyParent: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
          Draw your usable roof area
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          We use Google satellite imagery to help you mark the usable roof area.
          This improves the roof-size estimate, but the final panel layout and
          quantity still need to be confirmed by survey.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="text-sm">
            <span className="block font-medium text-slate-700">
              Find your property
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              type="text"
              value={addressSearch}
              placeholder="e.g. 55 Example Road, Guildford, GU2 9AH"
              onChange={(event) => setAddressSearch(event.target.value)}
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => centreMapOnAddress(addressSearch)}
            >
              Find address
            </button>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-600">{mapStatus}</p>

        <div
          ref={mapContainerRef}
          className="mt-4 h-[460px] w-full overflow-hidden rounded-xl border border-slate-200"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveCurrentRoofArea}
            disabled={currentPath.length < 3}
          >
            Save roof area
          </button>

          <button
            type="button"
            className="secondary-mini"
            onClick={undoLastPoint}
            disabled={currentPath.length === 0}
          >
            Undo last point
          </button>

          <button
            type="button"
            className="secondary-mini"
            onClick={clearDraftShape}
            disabled={currentPath.length === 0}
          >
            Clear current outline
          </button>

          <button
            type="button"
            className="secondary-mini"
            onClick={() => clearAllRoofDrawing()}
            disabled={roofPlanes.length === 0 && currentPath.length === 0}
          >
            Clear all roof areas
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Current outline: {currentPath.length} point
          {currentPath.length === 1 ? "" : "s"}. Click around the roof corners,
          then press “Save roof area”.
        </p>
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

                <button
                  type="button"
                  className="secondary-mini"
                  onClick={() => removeRoofPlane(index)}
                >
                  Remove
                </button>
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