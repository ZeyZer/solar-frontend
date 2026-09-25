import React, { useState } from "react";
import "./App.css";

import {
  PLATFORM,
  INSTALLER,
  ACTIVE_THEME_STYLE,
  CONTACT_EMAIL,
  CALCULATOR_STARTS_OPEN,
  MARKETING_SITE_URL,
} from "./config/siteConfig";


// UTILS //
import {
  TOTAL_STEPS,
  DEFAULT_FORM,
  loadSavedState,
  STORAGE_KEY,
} from "./utils/appStateUtils";

import { cleanTariffObject,} from "./utils/tariffUtils";


// COMPONENTS //
import LoadingScreen from "./components/LoadingScreen";
import TariffModal from "./components/TariffModal";
import QuotePage from "./components/QuotePage";
import QuoteForm from "./components/QuoteForm";
import LandingPage from "./components/LandingPage";
import SiteFooter from "./components/SiteFooter";
import PdfQuoteRoute from "./components/PdfQuoteRoute";



// HOOKS //
import useFakeQuoteProgress from "./hooks/useFakeQuoteProgress";
import useRoofWizard from "./hooks/useRoofWizard";
import usePdfQuoteData from "./hooks/usePdfQuoteData";
import usePersistedQuoteState from "./hooks/usePersistedQuoteState";
import useAppPageEffects from "./hooks/useAppPageEffects";
import useTariffModal from "./hooks/useTariffModal";
import useFormHandlers from "./hooks/useFormHandlers";
import useQuoteSubmit from "./hooks/useQuoteSubmit";
import useAppNavigation from "./hooks/useAppNavigation";
import useQuotePdfDownload from "./hooks/useQuotePdfDownload";



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
    if (CALCULATOR_STARTS_OPEN) return true;

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

  const [roofInputMode, setRoofInputMode] = useState(() => {
    const savedMode = savedState?.roofInputMode;

    const hasSavedManualRoofs =
      savedMode === "panel_count" &&
      Array.isArray(savedState?.roofs) &&
      savedState.roofs.length > 0;

    // Satellite roof modelling is the normal customer journey.
    // Preserve an existing manual roof entry only when the customer
    // had actually added manual roofs already.
    return hasSavedManualRoofs
      ? "panel_count"
      : "draw_my_roof";
  });

  const [roofGeometry, setRoofGeometry] = useState(
    savedState?.roofGeometry || null
  );

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
    roofInputMode,
    roofGeometry,
    quote,
    rentingBlocked,
  });

  useAppPageEffects({
    page,
  });

  // Full Financials Pop-up
  const progressPercent = (step / TOTAL_STEPS) * 100;

  /**
   * =========================================================
   * Navigation helpers
   * =========================================================
   */
  const {
    startEstimate,
    goToHome,
    handleNext,
    handlePrev,
    editAnswers,
  } = useAppNavigation({
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
  });

  function exitQuoteToMarketingSite() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    setQuote(null);
    setRentingBlocked(false);
    setLoading(false);
    setError("");
    setStep(1);
    setForm(DEFAULT_FORM);
    resetRoofs();
    setRoofInputMode("draw_my_roof");
    setRoofGeometry(null);
    setNeedsRecalc(false);
    setUpdatedSections([]);
    setPage("form");
    setStarted(CALCULATOR_STARTS_OPEN ? true : false);

    window.location.assign(MARKETING_SITE_URL);
  }

  /**
   * =========================================================
   * Change handlers
   * =========================================================
   */
  const {
    handleChange,
    handlePostcodeChange,
  } = useFormHandlers({
    setForm,
  });

  /*
   * =========================================================
   * Submit
   * =========================================================
   */

  const {
    handleSubmit,
  } = useQuoteSubmit({
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
  });


  /*
   * =========================================================
   * PDF Creation
   * =========================================================
   */

  const {
    handleDownloadPdf,
  } = useQuotePdfDownload({
    quote,
    form,
    roofs,
  });

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
    <div
      className={started || CALCULATOR_STARTS_OPEN ? "app app-started" : "app app-landing"}
      style={ACTIVE_THEME_STYLE}
    >
      {!started && !CALCULATOR_STARTS_OPEN && (
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
              setForm={setForm}
              roofs={roofs}
              onEdit={(stepNum) => editAnswers(stepNum)}
              onBackToForm={exitQuoteToMarketingSite}
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
              roofInputMode={roofInputMode}
              setRoofInputMode={setRoofInputMode}
              roofGeometry={roofGeometry}
              setRoofGeometry={setRoofGeometry}
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
