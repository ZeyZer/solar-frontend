import {
  STORAGE_KEY,
  TOTAL_STEPS,
  DEFAULT_FORM,
} from "../utils/appStateUtils";

import { CALCULATOR_STARTS_OPEN } from "../config/siteConfig";

export default function useAppNavigation({
  setQuote,
  setRentingBlocked,
  setError,
  setStep,
  setStarted,
  setForm,
  resetRoofs,
  setRoofInputMode,
  setRoofGeometry,
  setPage,
  setLoading,
}) {
  function clearSavedState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function startEstimate() {
    clearSavedState();

    setQuote(null);
    setRentingBlocked(false);
    setError("");
    setStep(1);
    setStarted(true);
    setForm(DEFAULT_FORM);
    resetRoofs();
    setRoofInputMode?.("panel_count");
    setRoofGeometry?.(null);
    setPage("form");
  }

  function goToHome() {
    clearSavedState();

    setStarted(CALCULATOR_STARTS_OPEN ? true : false);
    setStep(1);
    setForm(DEFAULT_FORM);
    setQuote(null);
    setRentingBlocked(false);
    setLoading(false);
    setError("");
    resetRoofs();
    setRoofInputMode?.("panel_count");
    setRoofGeometry?.(null);
    setPage("form");
  }

  function handleNext() {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }

  function handlePrev() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function editAnswers(goToStepNumber) {
    setPage("form");
    setStep(goToStepNumber);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return {
    startEstimate,
    goToHome,
    handleNext,
    handlePrev,
    editAnswers,
  };
}