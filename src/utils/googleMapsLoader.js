import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

let optionsSet = false;

export function getGoogleMapsApiKey() {
  return process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
}

export function isGoogleMapsConfigured() {
  return Boolean(getGoogleMapsApiKey());
}

export async function loadGoogleMapsLibrary(libraryName) {
  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    throw new Error("REACT_APP_GOOGLE_MAPS_API_KEY is missing.");
  }

  if (!optionsSet) {
    setOptions({
      key: apiKey,
      version: "weekly",
    });

    optionsSet = true;
  }

  return importLibrary(libraryName);
}
