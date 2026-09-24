import React, { useEffect, useRef, useState } from "react";

import {
  isGoogleMapsConfigured,
  loadGoogleMapsLibrary,
} from "../../utils/googleMapsLoader";

import {
  getHouseNumberOrNameFromSelectedAddress,
  normaliseGooglePlaceAddress,
} from "../../utils/selectedAddressUtils";

export default function GooglePlacesAddressLookup({
  form,
  setForm,
  handleChange,
  handlePostcodeChange,
  setError,
  setRoofGeometry,
}) {
  const containerRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const googleConfigured = isGoogleMapsConfigured();

  useEffect(() => {
    if (!googleConfigured || autocompleteRef.current || !containerRef.current) {
      return;
    }

    let cancelled = false;
    let autocompleteElement = null;

    async function initialiseAutocomplete() {
      setLoading(true);
      setStatus("Loading address search…");

      try {
        const placesLibrary = await loadGoogleMapsLibrary("places");

        if (cancelled || !containerRef.current) {
          return;
        }

        const { PlaceAutocompleteElement } = placesLibrary;

        autocompleteElement = new PlaceAutocompleteElement();

        autocompleteElement.placeholder =
          "Start typing the installation address";

        autocompleteElement.includedRegionCodes = ["gb"];

        autocompleteElement.style.display = "block";
        autocompleteElement.style.width = "100%";

        autocompleteElement.addEventListener("gmp-select", async (event) => {
          const placePrediction = event?.placePrediction;

          if (!placePrediction) {
            setStatus("No address was selected. Please try again.");
            return;
          }

          setLoading(true);
          setStatus("Loading selected address…");
          setError?.("");

          try {
            const place = placePrediction.toPlace();

            await place.fetchFields({
              fields: [
                "id",
                "formattedAddress",
                "location",
                "addressComponents",
              ],
            });

            const selectedAddress = normaliseGooglePlaceAddress(place);

            if (
              selectedAddress.latitude === null ||
              selectedAddress.longitude === null
            ) {
              setStatus(
                "Address selected, but Google did not return coordinates. Please choose another result."
              );
              return;
            }

            setForm((prev) => ({
              ...prev,
              address: selectedAddress.fullAddress,
              houseNumber:
                getHouseNumberOrNameFromSelectedAddress(selectedAddress),
              roadName: selectedAddress.roadName || "",
              town: selectedAddress.townOrCity || "",
              postcode: selectedAddress.postcode || "",
              selectedAddress,
            }));

            if (setRoofGeometry) {
              setRoofGeometry(null);
            }

            setStatus("Address selected. We will use this to centre the roof map.");
          } catch (err) {
            console.warn("Failed to load Google place details:", err);
            setStatus(
              err?.message ||
                "Could not load the selected address. Please try again."
            );
          } finally {
            setLoading(false);
          }
        });

        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(autocompleteElement);
        autocompleteRef.current = autocompleteElement;

        setStatus("");
      } catch (err) {
        console.warn("Google Places address search failed to load:", err);
        setStatus(
          err?.message ||
            "Google address search failed to load. Check your API key and Places API settings."
        );
      } finally {
        setLoading(false);
      }
    }

    initialiseAutocomplete();

    return () => {
      cancelled = true;

      if (autocompleteElement && autocompleteElement.parentNode) {
        autocompleteElement.parentNode.removeChild(autocompleteElement);
      }

      autocompleteRef.current = null;
    };
  }, [googleConfigured, setError, setForm, setRoofGeometry]);

  if (!googleConfigured) {
    return (
      <>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Google address search is not configured yet.</p>
          <p className="mt-1">
            Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to{" "}
            <code>.env.local</code> and restart the frontend.
          </p>
        </div>

        <label>
          <div className="question-label">🏘️ Your House Number / Name</div>
          <input
            type="text"
            name="houseNumber"
            value={form.houseNumber}
            onChange={handleChange}
            placeholder="e.g. 44 or Rose Cottage"
          />
        </label>

        <label>
          <div className="question-label">🛣️ Road name</div>
          <input
            type="text"
            name="roadName"
            value={form.roadName || ""}
            onChange={handleChange}
            placeholder="e.g. High Street"
          />
        </label>

        <label>
          <div className="question-label">🏙️ Town / city</div>
          <input
            type="text"
            name="town"
            value={form.town || ""}
            onChange={handleChange}
            placeholder="e.g. Guildford"
          />
        </label>

        <label>
          <div className="question-label">📍 Your Postcode</div>
          <input
            type="text"
            name="postcode"
            value={form.postcode}
            onChange={handlePostcodeChange}
            placeholder="e.g. GU1 1AA"
          />
        </label>
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="form-section-label">
        Installation Address
      </div>

      <p className="small-print">
        Start typing the property address and select the correct result.
      </p>

      <div className="mt-3" ref={containerRef} />

      {status &&
        (!form.selectedAddress || loading) && (
          <p className="mt-2 text-xs text-slate-500">
            {loading ? "Loading… " : ""}
            {status}
          </p>
        )}
    </div>
  );
}
