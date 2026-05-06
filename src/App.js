import React, { useState } from "react";
import "./App.css";

import {
  PLATFORM,
  INSTALLER,
  CONTACT_EMAIL,
} from "./config/siteConfig";

import {
  generateQuote,
  downloadQuotePdf,
} from "./api/quoteApi";

import {
  cleanTariffObject,
} from "./utils/tariffUtils";


import {
  formatPostcodeInput,
  isValidUkPostcode,
} from "./utils/postcodeUtils";

import LoadingScreen from "./components/LoadingScreen";

import TariffModal from "./components/TariffModal";

import QuotePage from "./components/QuotePage";

import QuoteForm from "./components/QuoteForm";

import LandingPage from "./components/LandingPage";
import SiteFooter from "./components/SiteFooter";

import PdfQuoteRoute from "./components/PdfQuoteRoute";

import {
  STORAGE_KEY,
  TOTAL_STEPS,
  DEFAULT_FORM,
  loadSavedState,
} from "./utils/appStateUtils";

import useFakeQuoteProgress from "./hooks/useFakeQuoteProgress";

import useRoofWizard from "./hooks/useRoofWizard";

import usePdfQuoteData from "./hooks/usePdfQuoteData";

import usePersistedQuoteState from "./hooks/usePersistedQuoteState";

import useAppPageEffects from "./hooks/useAppPageEffects";

import useTariffModal from "./hooks/useTariffModal";


function App() {
  const savedState = loadSavedState();
  const {
    progress,
    setProgress,
    startFakeProgress,
    stopFakeProgress,
    completeProgress,
  } = useFakeQuoteProgress();

  const {
    isPdfRoute,
    pdfQuote,
    pdfForm,
    pdfRoofs,
    pdfError,
  } = usePdfQuoteData();

  // Which screen are we showing: the step-by-step form, or the quote page?
  const [page, setPage] = useState(() => {
    if (savedState?.page === "quote-pdf") {
      return "form";
    }

    return savedState?.page || "form";
  });

  const [step, setStep] = useState(() =>
    savedState && typeof savedState.step === "number" ? savedState.step : 1
  );

  const [started, setStarted] = useState(() => {
    if (!savedState) return false;
    const inferredStarted =
      savedState.started === true ||
      (typeof savedState.step === "number" && savedState.step > 1) ||
      (savedState.form && (savedState.form.houseNumber || savedState.form.postcode));
    return !!inferredStarted;
  });

  const [form, setForm] = useState(() => {
    const loadedForm =
      savedState && savedState.form
        ? { ...DEFAULT_FORM, ...savedState.form }
        : { ...DEFAULT_FORM };

    return {
      ...loadedForm,
      tariffBefore: cleanTariffObject(loadedForm.tariffBefore, "before"),
      tariffAfter: cleanTariffObject(loadedForm.tariffAfter, "after"),
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Roof Pop-up Section
  const {
    roofModalOpen,

    roofWizardStep,
    setRoofWizardStep,

    editingRoofId,
    draftRoof,
    setDraftRoof,

    roofs,
    setRoofs,

    openAddRoofModal,
    openEditRoofModal,
    closeRoofModal,
    saveRoofFromDraft,
    resetRoofs,
  } = useRoofWizard({
    savedRoofs: savedState?.roofs,
    setError,
  });

  const [quote, setQuote] = useState(() => (savedState?.quote ? savedState.quote : null));

  const [rentingBlocked, setRentingBlocked] = useState(() =>
    savedState && typeof savedState.rentingBlocked === "boolean"
      ? savedState.rentingBlocked
      : false
  );

  // DIRTY STATE STUFF
  const [needsRecalc, setNeedsRecalc] = useState(false);
  const [updatedSections, setUpdatedSections] = useState([]);

  const {
    tariffModalOpen,
    tariffEditMode,
    draftTariff,
    setDraftTariff,
    openTariffModal,
    switchTariffMode,
    saveTariffFromDraft,
    closeTariffModal,
  } = useTariffModal({
    form,
    setForm,
    setNeedsRecalc,
    setUpdatedSections,
  });

  usePersistedQuoteState({
    isPdfRoute,
    page,
    step,
    started,
    form,
    roofs,
    quote,
    rentingBlocked,
  });

  useAppPageEffects({
    page,
  });

  // Full Financials Pop-up
  const progressPercent = (step / TOTAL_STEPS) * 100;

  // PDF CREATION
  const handleDownloadPdf = async () => {
    try {
      await downloadQuotePdf({
        quote,
        form,
        roofs,
      });
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert(`Sorry, the PDF could not be generated.\n\n${err.message}`);
    }
  };

  /**
   * =========================================================
   * Navigation helpers
   * =========================================================
   */
  function startEstimate() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    setQuote(null);
    setRentingBlocked(false);
    setError("");
    setStep(1);
    setStarted(true);
    setForm(DEFAULT_FORM);
    resetRoofs(); // ✅ reset roofs too
    setPage("form");
  }

  function goToHome() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    setStarted(false);
    setStep(1);
    setForm(DEFAULT_FORM);
    setQuote(null);
    setRentingBlocked(false);
    setLoading(false);
    setError("");
    resetRoofs();
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

    // Optional: scroll to top so the user sees the step
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * =========================================================
   * Change handlers
   * =========================================================
   */
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handlePostcodeChange(e) {
    const formatted = formatPostcodeInput(e.target.value);
    setForm((prev) => ({ ...prev, postcode: formatted }));
  }

  /*
   * =========================================================
   * Submit
   * =========================================================
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setQuote(null);

    const REQUIRE_CONTACT_DETAILS = false; // flip to true later

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

    // ✅ Use the roofs STATE (not form.roofs)
    const totalPanels = roofs.reduce((sum, r) => sum + Number(r.panels || 0), 0);
    if (!roofs.length || totalPanels <= 0) {
      setError("Please enter at least 1 panel across your roof spaces.");
      return;
    }

    try {
      setLoading(true);
      setProgress({ pct: 0, label: "Preparing your quote…" });
      startFakeProgress(12000);

      const cleanedTariffBefore = cleanTariffObject(form.tariffBefore, "before");
      const cleanedTariffAfter = cleanTariffObject(form.tariffAfter, "after");

      const payload = {
        name: form.name,
        email: form.email,
        address: derivedAddress,
        phone: form.phone,
        postcode: form.postcode,
        homeOwnership: form.homeOwnership,
        houseNumber: form.houseNumber,

        // ✅ NEW: send both tariffs to backend
        tariffBefore: cleanedTariffBefore,
        tariffAfter: cleanedTariffAfter,

        annualKWh: form.annualKWh ? Number(form.annualKWh) : undefined,
        monthlyBill: form.monthlyBill ? Number(form.monthlyBill) : undefined,

        // Keep these (fallback sizing / legacy)
        roofSize: form.roofSize,
        shading: form.shading,
        occupancyProfile: form.occupancyProfile,

        // ✅ Correct key name (lowercase)
        panelOption: form.panelOption,

        // ✅ Send roofs properly
        roofs: roofs.map((r) => ({
          orientation: r.orientation,          // "N" "NE" "E" ... "S" etc
          tilt: Number(r.tilt),
          shading: r.shading,
          panels: Number(r.panels),
        })),

        // ✅ Set panelCount from roofs so backend does not auto-size
        panelCount: totalPanels,

        batteryKWh: form.batteryKWh ? Number(form.batteryKWh) : 0,
        extras: {
          birdProtection: form.birdProtection,
          evCharger: form.evCharger,
        },
      };

      // 2) Start listening for backend progress updates (SSE)
      setProgress({ pct: 5, step: "starting", label: "Starting…" });

      const data = await generateQuote(payload);

      // ✅ Complete progress nicely before switching page
      stopFakeProgress();
      completeProgress();

      // Small delay so user perceives completion
      await new Promise((r) => setTimeout(r, 450));

      setQuote(data);
      setPage("quote");
    } catch (err) {
      stopFakeProgress();
      alert(err?.message || "Something went wrong.");
    } finally {
      stopFakeProgress();
      setLoading(false);
    }
  }
  

  /**
   * =========================================================
   * Render
   * =========================================================
  */

  if (isPdfRoute) {
    return (
      <PdfQuoteRoute
        pdfQuote={pdfQuote}
        pdfForm={pdfForm}
        pdfRoofs={pdfRoofs}
        pdfError={pdfError}
        contactEmail={CONTACT_EMAIL}
      />
    );
  }

  return (
    <div className={started ? "app app-started" : "app app-landing"}>
      {!started && (
        <LandingPage
          platform={PLATFORM}
          installer={INSTALLER}
          onStartEstimate={startEstimate}
        />
      )}
      
      {started && (
        <>
          {loading ? (
            <LoadingScreen pct={progress.pct} label={progress.label} />
          ) : page === "quote" ? (
            <QuotePage
              quote={quote}
              form={form}
              roofs={roofs}
              onEdit={(stepNum) => editAnswers(stepNum)}
              onBackToForm={() => setPage("form")}
              onDownloadPdf={handleDownloadPdf}
              onUpdateQuote={setQuote}
              onOpenTariffModal={(mode) => openTariffModal(mode)}
              pdfMode={false}
              needsRecalc={needsRecalc}
              setNeedsRecalc={setNeedsRecalc}
              updatedSections={updatedSections}
              setUpdatedSections={setUpdatedSections}
            />
          ) : (
            <>
            <QuoteForm
              step={step}
              setStep={setStep}
              progressPercent={progressPercent}
              rentingBlocked={rentingBlocked}
              setRentingBlocked={setRentingBlocked}
              form={form}
              setForm={setForm}
              handleChange={handleChange}
              handlePostcodeChange={handlePostcodeChange}
              handleNext={handleNext}
              handlePrev={handlePrev}
              handleSubmit={handleSubmit}
              error={error}
              setError={setError}
              loading={loading}
              quote={quote}
              contactEmail={CONTACT_EMAIL}
              openTariffModal={openTariffModal}
              roofs={roofs}
              setRoofs={setRoofs}
              openAddRoofModal={openAddRoofModal}
              openEditRoofModal={openEditRoofModal}
              roofModalOpen={roofModalOpen}
              editingRoofId={editingRoofId}
              roofWizardStep={roofWizardStep}
              setRoofWizardStep={setRoofWizardStep}
              draftRoof={draftRoof}
              setDraftRoof={setDraftRoof}
              closeRoofModal={closeRoofModal}
              saveRoofFromDraft={saveRoofFromDraft}
              goToHome={goToHome}
            />
        </>
        )}
      </>
     )}
      {/* ===========================
          TARIFF WIZARD MODAL (Quiz)
       =========================== */}
      <TariffModal
        open={tariffModalOpen}
        tariffEditMode={tariffEditMode}
        switchTariffMode={switchTariffMode}
        draftTariff={draftTariff}
        setDraftTariff={setDraftTariff}
        onClose={closeTariffModal}
        onSave={saveTariffFromDraft}
      />

      <SiteFooter
        platform={PLATFORM}
        installer={INSTALLER}
      />
    </div>
  );
}

export default App;
