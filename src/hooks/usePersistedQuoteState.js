import { useEffect } from "react";

import {
  STORAGE_KEY,
} from "../utils/appStateUtils";

export default function usePersistedQuoteState({
  isPdfRoute,
  page,
  step,
  started,
  form,
  roofs,
  roofInputMode,
  roofGeometry,
  quote,
  rentingBlocked,
}) {
  useEffect(() => {
    if (isPdfRoute) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          page,
          step,
          started,
          form,
          roofs,
          roofInputMode,
          roofGeometry,
          quote,
          rentingBlocked,
        })
      );
    } catch (err) {
      console.warn("Failed to persist quote state:", err);
    }
  }, [
    isPdfRoute,
    page,
    step,
    started,
    form,
    roofs,
    roofInputMode,
    roofGeometry,
    quote,
    rentingBlocked,
  ]);
}