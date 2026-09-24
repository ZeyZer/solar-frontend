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
  buildConfirmedPostalAddress,
} from "../utils/selectedAddressUtils";

import {
  resolveBatterySelection,
} from "../utils/batteryScenarioUtils";

export default function useQuoteSubmit({
  form,
  roofs,
  roofInputMode,
  roofGeometry,

  setError,
  setQuote,
  setForm,
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

    const derivedAddress = buildConfirmedPostalAddress(form);

    if (!(form.houseNumber || "").trim()) {
      setError("Please enter the house name or number.");
      return;
    }

    if (!(form.roadName || "").trim()) {
      setError("Please enter the road name.");
      return;
    }

    if (!(form.town || "").trim()) {
      setError("Please enter the town or city.");
      return;
    }

    if (!(form.postcode || "").trim()) {
      setError("Please enter the postcode.");
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
      const hasSolarTargetBuildings =
        Array.isArray(roofGeometry?.solarTargetBuildings) &&
        roofGeometry.solarTargetBuildings.length > 0;

      const hasSolarApiAnalysis = Boolean(roofGeometry?.solarApiAnalysis?.summary);

      if (!hasSolarTargetBuildings) {
        setError("Please select at least one building roof on the map before continuing.");
        return;
      }

      if (!hasSolarApiAnalysis) {
        setError("Please click “Analyse selected buildings” before continuing.");
        return;
      }
    }

    if (!roofs.length || totalPanels <= 0) {
      setError(
        roofInputMode === "draw_my_roof"
          ? "Please confirm your selected roof layout before continuing."
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

        houseNumber: form.houseNumber,
        roadName: form.roadName,
        town: form.town,
        postcode: form.postcode,

        addressDetails: {
          propertyNameOrNumber: form.houseNumber,
          roadName: form.roadName,
          townOrCity: form.town,
          postcode: form.postcode,
          fullAddress: derivedAddress,
        },

        homeOwnership: form.homeOwnership,
        propertyType: form.propertyType || "unknown",

        selectedAddress: form.selectedAddress || null,
        addressLatitude: form.selectedAddress?.latitude ?? null,
        addressLongitude: form.selectedAddress?.longitude ?? null,

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
          ? {
              roofGeometry: {
                ...roofGeometry,
                propertyType: form.propertyType || "unknown",
              },
            }
          : {}),

        roofs: roofs.map((r) => ({
          id: r.id || null,
          source: r.source || null,
          sourceBuildingId: r.sourceBuildingId || null,
          sourceTargetLabel: r.sourceTargetLabel || null,
          sourceSegmentId: r.sourceSegmentId || null,
          sourceSegmentIndex: r.sourceSegmentIndex ?? null,

          orientation: r.orientation,
          tilt: Number(r.tilt),
          shading: r.shading,
          panels: Number(r.panels),

          aiRoofData: r.aiRoofData || null,
          aiModelNotes: r.aiModelNotes || null,
        })),

        panelCount: totalPanels,

        batteryChoiceMode:
          form.batteryChoiceMode || "recommend",

        batteryStrategy:
          form.batteryStrategy || "balanced",

        batteryKWh:
          form.batteryChoiceMode === "custom"
            ? Number(
                form.batteryCustomKWh ??
                form.batteryKWh ??
                0
              )
            : 0,

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

      const resolvedBattery =
        resolveBatterySelection(data, form);

      stopFakeProgress();
      completeProgress();

      await new Promise((resolve) => setTimeout(resolve, 450));

      setForm?.((prev) => ({
        ...prev,
        batteryKWh:
          resolvedBattery.batteryKWh,
      }));

      setQuote(resolvedBattery.quote);
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