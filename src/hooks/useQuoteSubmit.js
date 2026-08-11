import {
  generateQuote,
} from "../api/quoteApi";

import {
  cleanTariffObject,
} from "../utils/tariffUtils";

import {
  isValidUkPostcode,
} from "../utils/postcodeUtils";

import {
  validateRoofGeometryPayload,
} from "../utils/roofGeometryPayload";

export default function useQuoteSubmit({
  form,
  roofs,
  roofInputMode,
  roofGeometry,

  setError,
  setQuote,
  setLoading,
  setPage,

  setProgress,
  startFakeProgress,
  stopFakeProgress,
  completeProgress,

  setNeedsRecalc,
  setUpdatedSections,
}) {
  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setQuote(null);

    const REQUIRE_CONTACT_DETAILS = false;

    const derivedAddress =
      form.address && form.address.trim()
        ? form.address.trim()
        : `${form.houseNumber || ""} ${form.postcode || ""}`.trim();

    if (!derivedAddress || !form.postcode) {
      setError("Please enter your house number and postcode so we can run the estimate.");
      return;
    }

    if (REQUIRE_CONTACT_DETAILS) {
      if (!form.name || !form.email) {
        setError("Please enter your name and email so we can send your estimate.");
        return;
      }
    }

    if (!isValidUkPostcode(form.postcode)) {
      setError("Please enter a valid UK postcode (e.g. SW1A 1AA).");
      return;
    }

    const totalPanels = roofs.reduce(
      (sum, r) => sum + Number(r.panels || 0),
      0
    );

    if (roofInputMode === "draw_my_roof") {
      const roofGeometryErrors = validateRoofGeometryPayload(roofGeometry);

      if (roofGeometryErrors.length > 0) {
        setError(roofGeometryErrors[0]);
        return;
      }
    }

    if (!roofs.length || totalPanels <= 0) {
      setError(
        roofInputMode === "draw_my_roof"
          ? "Please also add an estimated panel count for now. The roof drawing is saved as geometry, but this quote version still needs a panel-count estimate for the calculation."
          : "Please enter at least 1 panel across your roof spaces."
      );
      return;
    }

    try {
      setLoading(true);
      setProgress({ pct: 0, label: "Preparing your quote…" });
      startFakeProgress(12000);

      const cleanedTariffBefore = cleanTariffObject(
        form.tariffBefore,
        "before"
      );

      const cleanedTariffAfter = cleanTariffObject(
        form.tariffAfter,
        "after"
      );

      const payload = {
        name: form.name,
        email: form.email,
        address: derivedAddress,
        phone: form.phone,
        postcode: form.postcode,
        homeOwnership: form.homeOwnership,
        houseNumber: form.houseNumber,

        tariffBefore: cleanedTariffBefore,
        tariffAfter: cleanedTariffAfter,

        annualKWh: form.annualKWh ? Number(form.annualKWh) : undefined,
        monthlyBill: form.monthlyBill ? Number(form.monthlyBill) : undefined,

        roofSize: form.roofSize,
        shading: form.shading,
        occupancyProfile: form.occupancyProfile,

        panelOption: form.panelOption,

        roofInputMode,

        ...(roofInputMode === "draw_my_roof" && roofGeometry
          ? { roofGeometry }
          : {}),

        roofs: roofs.map((r) => ({
          orientation: r.orientation,
          tilt: Number(r.tilt),
          shading: r.shading,
          panels: Number(r.panels),
        })),

        panelCount: totalPanels,

        batteryKWh: form.batteryKWh ? Number(form.batteryKWh) : 0,

        extras: {
          birdProtection: form.birdProtection,
          evCharger: form.evCharger,
        },
      };

      setProgress({
        pct: 5,
        step: "starting",
        label: "Starting…",
      });

      const data = await generateQuote(payload);

      stopFakeProgress();
      completeProgress();

      await new Promise((resolve) => setTimeout(resolve, 450));

      setQuote(data);
      setNeedsRecalc?.(false);
      setUpdatedSections?.([]);
      setPage("quote");
    } catch (err) {
      stopFakeProgress();
      alert(err?.message || "Something went wrong.");
    } finally {
      stopFakeProgress();
      setLoading(false);
    }
  }

  return {
    handleSubmit,
  };
}