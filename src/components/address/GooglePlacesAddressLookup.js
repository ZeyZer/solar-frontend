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

  function clearSelectedAddress() {
    setForm((prev) => ({
      ...prev,
      address: "",
      houseNumber: "",
      postcode: "",
      selectedAddress: null,
    }));

    setStatus("");
    setError?.("");

    if (setRoofGeometry) {
      setRoofGeometry(null);
    }
  }

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
          "Start typing your full address, e.g. 55 Example Road, Guildford";

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
                getHouseNumberOrNameFromSelectedAddress(selectedAddress) ||
                prev.houseNumber,
              postcode: selectedAddress.postcode || prev.postcode,
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

        setStatus("Start typing your address, then select the correct result.");
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
          <div className="question-label">📍 Your Postcode</div>
          <input
            type="text"
            name="postcode"
            value={form.postcode}
            onChange={handlePostcodeChange}
            placeholder="e.g. SW1A 1AA"
          />
        </label>
      </>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="question-label">📍 Find your property</div>

      <p className="small-print">
        Start typing your full address and select the correct result. This lets
        us open the roof map on the right property before you select the roofs to
        assess.
      </p>

      <div className="mt-3" ref={containerRef} />

      {form.selectedAddress?.fullAddress && (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Selected address</p>
          <p className="mt-1">{form.selectedAddress.fullAddress}</p>

          {form.selectedAddress.latitude !== null &&
            form.selectedAddress.longitude !== null && (
              <p className="mt-1 text-xs">
                Map coordinates saved for roof modelling.
              </p>
            )}

          <button
            type="button"
            className="secondary-mini mt-3"
            onClick={clearSelectedAddress}
          >
            Change address
          </button>
        </div>
      )}

      {status && (
        <p className="mt-3 text-sm text-slate-600">
          {loading ? "⏳ " : ""}
          {status}
        </p>
      )}
    </div>
  );
}
