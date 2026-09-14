function cleanText(value) {
  return String(value || "").trim();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getLatLngFromGoogleLocation(location) {
  if (!location) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  const lat =
    typeof location.lat === "function"
      ? location.lat()
      : location.lat;

  const lng =
    typeof location.lng === "function"
      ? location.lng()
      : location.lng;

  return {
    latitude: numberOrNull(lat),
    longitude: numberOrNull(lng),
  };
}

function getAddressComponent(place, type) {
  const components = Array.isArray(place?.addressComponents)
    ? place.addressComponents
    : [];

  const match = components.find((component) =>
    Array.isArray(component.types) && component.types.includes(type)
  );

  return (
    cleanText(match?.longText) ||
    cleanText(match?.long_name) ||
    cleanText(match?.shortText) ||
    cleanText(match?.short_name)
  );
}

export function normaliseGooglePlaceAddress(place) {
  const { latitude, longitude } = getLatLngFromGoogleLocation(place?.location);

  const postcode = getAddressComponent(place, "postal_code");
  const townOrCity =
    getAddressComponent(place, "postal_town") ||
    getAddressComponent(place, "locality");

  const county = getAddressComponent(place, "administrative_area_level_2");
  const country =
    getAddressComponent(place, "country") ||
    "United Kingdom";

  const premise = getAddressComponent(place, "premise");
  const subpremise = getAddressComponent(place, "subpremise");
  const streetNumber = getAddressComponent(place, "street_number");
  const route = getAddressComponent(place, "route");

  const propertyNameOrNumber =
    premise ||
    [subpremise, streetNumber].filter(Boolean).join(", ");

  const line1 = [propertyNameOrNumber, route].filter(Boolean).join(" ");

  return {
    source: "google_places",
    lookupType: "places_autocomplete_selected_address",

    placeId: cleanText(place?.id || place?.placeId || place?.name),
    displayName:
      cleanText(place?.displayName?.text) ||
      cleanText(place?.displayName) ||
      "",

    fullAddress: cleanText(place?.formattedAddress),
    line1,

    propertyNameOrNumber,
    premise,
    subpremise,
    streetNumber,
    roadName: route,

    townOrCity,
    county,
    country,
    postcode,

    latitude,
    longitude,

    rawProviderFields: {
      id: cleanText(place?.id || place?.placeId || place?.name),
      formattedAddress: cleanText(place?.formattedAddress),
    },
  };
}

export function getHouseNumberOrNameFromSelectedAddress(selectedAddress) {
  return (
    cleanText(selectedAddress?.propertyNameOrNumber) ||
    cleanText(selectedAddress?.premise) ||
    cleanText(selectedAddress?.subpremise) ||
    cleanText(selectedAddress?.streetNumber)
  );
}

export function buildConfirmedPostalAddress(form) {
  return [
    form?.houseNumber,
    form?.roadName,
    form?.town,
    form?.postcode,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
}
