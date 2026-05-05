import React, { useEffect, useState, useRef} from "react";
import "./App.css";

import {
  PLATFORM,
  INSTALLER,
  CONTACT_EMAIL,
} from "./config/siteConfig";

import {
  API_BASE,
  generateQuote,
  getPdfQuoteData,
  downloadQuotePdf,
} from "./api/quoteApi";

import {
  DEFAULT_TARIFF,
  cleanTariffObject,
} from "./utils/tariffUtils";


import {
  formatPostcodeInput,
  isValidUkPostcode,
} from "./utils/postcodeUtils";

import LoadingScreen from "./components/LoadingScreen";

import TariffModal from "./components/TariffModal";

import QuotePage from "./components/QuotePage";

import {
  getRoofThumbsForRoof,
  RoofSummaryRow,
} from "./components/RoofWizardHelpers";

import RoofWizardModal from "./components/RoofWizardModal";

import {
  STORAGE_KEY,
  TOTAL_STEPS,
  DEFAULT_FORM,
  DEFAULT_ROOFS,
  EMPTY_DRAFT_ROOF,
  loadSavedState,
} from "./utils/appStateUtils";

import useFakeQuoteProgress from "./hooks/useFakeQuoteProgress";


function App() {
  const savedState = loadSavedState();
  const {
  progress,
    setProgress,
    startFakeProgress,
    stopFakeProgress,
    completeProgress,
  } = useFakeQuoteProgress();
  const isPdfRoute = window.location.hash.startsWith("#/quote-pdf");

  // Which screen are we showing: the step-by-step form, or the quote page?
  const [page, setPage] = useState(() => {
    if (window.location.hash === "#/quote-pdf" || window.location.pathname === "/quote-pdf") {
      return "quote-pdf";
    }

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

  // Roof Pop-up Section
  const [roofModalOpen, setRoofModalOpen] = useState(false);
  const [roofWizardStep, setRoofWizardStep] = useState(0);
  const [editingRoofId, setEditingRoofId] = useState(null);

  const [draftRoof, setDraftRoof] = useState(EMPTY_DRAFT_ROOF);


  // ✅ Roofs are stored in their own state (NOT in form.roofs)
  const [roofs, setRoofs] = useState(() => {
    if (savedState?.roofs?.length) return savedState.roofs;
    return DEFAULT_ROOFS();
  });

  const [quote, setQuote] = useState(() => (savedState?.quote ? savedState.quote : null));

  const [rentingBlocked, setRentingBlocked] = useState(() =>
    savedState && typeof savedState.rentingBlocked === "boolean"
      ? savedState.rentingBlocked
      : false
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // Tariff modal state
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [tariffEditMode, setTariffEditMode] = useState("after");

  // Single draft bucket (IMPORTANT)
  const [draftTariff, setDraftTariff] = useState(() => ({
    ...DEFAULT_TARIFF,
    ...(form?.tariffAfter || {})
  }));

  // PDF USE STATES
  const [pdfQuote, setPdfQuote] = useState(null);
  const [pdfForm, setPdfForm] = useState(null);
  const [pdfRoofs, setPdfRoofs] = useState([]);

  useEffect(() => {
    if (!isPdfRoute) return;

    async function loadPdfData() {
      try {
        console.log("PDF page is loading quote data");
        console.log("PDF API_BASE:", API_BASE);
        console.log("PDF fetch URL:", `${API_BASE}/api/quote/pdf-data`);

        const data = await getPdfQuoteData();

        console.log("PDF data loaded:", {
          hasQuote: !!data.quote,
          hasForm: !!data.form,
          roofsCount: Array.isArray(data.roofs) ? data.roofs.length : 0,
        });

        setPdfQuote(data.quote || null);
        setPdfForm(data.form || null);
        setPdfRoofs(data.roofs || []);
      } catch (err) {
        console.error("Failed to load PDF data:", err);
      }
    }

    loadPdfData();
  }, [isPdfRoute]);

  // DIRTY STATE STUFF
  const [needsRecalc, setNeedsRecalc] = useState(false);
  const [updatedSections, setUpdatedSections] = useState([]);

  function openTariffModal(mode = "after") {
    setTariffEditMode(mode);

    const src = mode === "before"
      ? form.tariffBefore
      : form.tariffAfter;

    setDraftTariff(cleanTariffObject(src, mode));
    setTariffModalOpen(true);
  }

  function switchTariffMode(nextMode) {
    setForm((prev) => {
      const next = { ...prev };

      // commit current draft
      if (tariffEditMode === "before") {
        next.tariffBefore = cleanTariffObject(
          { ...(prev.tariffBefore || {}), ...draftTariff },
          "before"
        );
      } else {
        next.tariffAfter = cleanTariffObject(
          { ...(prev.tariffAfter || {}), ...draftTariff },
          "after"
        );
      }

      // load next draft
      const nextBucket =
        nextMode === "before" ? next.tariffBefore : next.tariffAfter;

      setDraftTariff(cleanTariffObject(nextBucket, nextMode));
      setTariffEditMode(nextMode);

      return next;
    });
  }

  function saveTariffFromDraft() {
    setForm((prev) => {
      if (tariffEditMode === "before") {
        return {
          ...prev,
          tariffBefore: cleanTariffObject(
            { ...(prev.tariffBefore || {}), ...draftTariff },
            "before"
          ),
        };
      }

      return {
        ...prev,
        tariffAfter: cleanTariffObject(
          { ...(prev.tariffAfter || {}), ...draftTariff },
          "after"
        ),
      };
    });

    setNeedsRecalc(true);
    setUpdatedSections([]);
    setTariffModalOpen(false);
  }

  function closeTariffModal() {
    setTariffModalOpen(false);
  }

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
   * Persist state
   * =========================================================
   */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ started, step, form, rentingBlocked, quote, roofs, page })
      );
    } catch (e) {
      console.warn("Failed to save state", e);
    }
  }, [started, step, form, rentingBlocked, quote, roofs, page]);

  useEffect(() => {
    if (window.location.pathname === "/quote-pdf") {
      console.log("Detected /quote-pdf route");
      setStarted(true);
      setPage("quote-pdf");
    }
  }, []);

  useEffect(() => {
    if (page === "quote") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [page]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

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
    setRoofs(DEFAULT_ROOFS()); // ✅ reset roofs too
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
    setRoofs(DEFAULT_ROOFS());
    setPage("form");
  }

  function handleNext() {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }

  function handlePrev() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function openAddRoofModal() {
    setEditingRoofId(null);
    setDraftRoof(EMPTY_DRAFT_ROOF());
    setRoofWizardStep(0);
    setRoofModalOpen(true);
    setError("");
  }

  function openEditRoofModal(roof) {
    setEditingRoofId(roof.id);
    setDraftRoof({ ...roof });     // copy existing values into the draft
    setRoofWizardStep(0);
    setRoofModalOpen(true);
    setError("");
  }

  function closeRoofModal() {
    setRoofModalOpen(false);
    setEditingRoofId(null);
  }

  function editAnswers(goToStepNumber) {
    setPage("form");
    setStep(goToStepNumber);

    // Optional: scroll to top so the user sees the step
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveRoofFromDraft() {
    // basic validation: must have answers (you can tighten later)
    if (!draftRoof.orientation || !draftRoof.tilt || !draftRoof.shading) {
      setError("Please complete the roof questions.");
      return;
    }
    if (!draftRoof.panels || Number(draftRoof.panels) <= 0) {
      setError("Please enter at least 1 panel for this roof.");
      return;
    }

    setRoofs((prev) => {
      // editing existing
      if (editingRoofId) {
        return prev.map((r) => (r.id === editingRoofId ? { ...draftRoof } : r));
      }
      // adding new
      return [...prev, { ...draftRoof }];
    });

    closeRoofModal();
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


      console.log("SENDING tariffBefore:", payload.tariffBefore);
      console.log("SENDING tariffAfter:", payload.tariffAfter);
      console.log("SENDING tariff:", payload.tariff);

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

  console.log("Render state:", {
    page,
    started,
    hasQuote: !!quote,
    hasPdfQuote: !!pdfQuote,
    hasPdfForm: !!pdfForm,
    pathname: window.location.pathname
  });
  

  /**
   * =========================================================
   * Render
   * =========================================================
  */

  if (isPdfRoute) {
    if (!pdfQuote || !pdfForm) {
      return (
        <div
          id="pdf-loading"
          style={{ padding: 40, fontFamily: "sans-serif" }}
        >
          Loading PDF quote...
        </div>
      );
    }

    return (
      <div id="pdf-ready" data-pdf-ready="true">
        <QuotePage
          quote={pdfQuote}
          form={pdfForm}
          roofs={pdfRoofs}
          onEdit={() => {}}
          onBackToForm={() => {}}
          onDownloadPdf={() => {}}
          onUpdateQuote={() => {}}
          onOpenTariffModal={() => {}}
          pdfMode={true}
        />
      </div>
    );
  }

  return (
    <div className={started ? "app app-started" : "app app-landing"}>
      {!started && (
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-tags">
              <span className="landing-tag">Under 60 seconds</span>
              <span className="landing-tag">No obligation estimate</span>
              <span className="landing-tag">5 Star Trusted Trader</span>
            </div>

            <div className="landing-hero-main">
              <div className="landing-hero-left">
                <h1 className="landing-title">
                  Instant Solar Estimate
                  <span>For Your Home</span>
                </h1>

                <p className="landing-subtitle">See what solar &amp; battery could save you!</p>

                <div className="landing-cta-row">
                  <button type="button" className="landing-cta-button" onClick={startEstimate}>
                    Start my estimate
                    <span className="landing-cta-arrow">➜</span>
                  </button>

                  <p className="landing-cta-note">
                    Answer a few quick questions to see a tailored system, price range, savings and simple payback.
                    <br />
                    <span className="landing-no-sales">No sales calls.</span>
                  </p>
                </div>
              </div>

              <div className="landing-hero-right">
                <img
                  src="/solar-hero.png"
                  alt="Solar panels, sun and savings illustration"
                  className="landing-hero-image"
                />
              </div>
            </div>
          </div>

          <div className="landing-brand-bar">
            <div className="landing-brand-inner">
              <div className="landing-brand-left">
                <div className="brand-logo-circle">ZE</div>
                <div className="brand-text">
                  {INSTALLER ? (
                    <>
                      Estimate provided by <strong>{INSTALLER.name}</strong> via{" "}
                      <strong>{PLATFORM.toolName}</strong>
                    </>
                  ) : (
                    <>
                      <strong>{PLATFORM.toolName}</strong> connects you with local installers
                    </>
                  )}
                </div>
              </div>

              {INSTALLER?.accreditations?.length ? (
                <div className="landing-brand-badges">
                  {INSTALLER.accreditations.map((b) => (
                    <span key={b} className="brand-pill">{b}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
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
              pdfMode = {false}
              needsRecalc={needsRecalc}
              setNeedsRecalc={setNeedsRecalc}
              updatedSections={updatedSections}
              setUpdatedSections={setUpdatedSections}
            />
          ) : page === "quote-pdf" ? (
            pdfQuote && pdfForm ? (
              <QuotePage
                quote={pdfQuote}
                form={pdfForm}
                roofs={pdfRoofs}
                onUpdateQuote={() => {}}
                pdfMode={true}
              />
            ) : (
              <div style={{ padding: "40px", fontSize: "18px" }}>
                Loading PDF quote...
              </div>
            )
          ) : (
            <>
              <div className="mobile-tool-topbar">
                <button type="button" className="mobile-home-button" onClick={goToHome}>
                  ← Home
                </button>
              </div>

          <section className="tool-section">
            <div className="section-inner">
              {rentingBlocked ? (
                <div className="renting-message-card">
                  <h1>Sorry!</h1>
                  <h2>We can only quote homeowners right now</h2>
                  <p>
                    Thanks for your interest in solar. At the moment, we can only provide an
                    installation quote if you are the homeowner (or buying the property).
                  </p>
                  <p>
                    If you are renting, you may still be able to have solar installed via your
                    landlord or managing agent.
                  </p>
                  <p>
                    If you clicked &quot;Renting&quot; by mistake, you can go back and choose
                    &quot;Homeowner&quot; instead.
                  </p>
                  <div className="rent-buttons-row">
                    <button
                      type="button"
                      onClick={() => {
                        setRentingBlocked(false);
                        setStep(1);
                        setError("");
                      }}
                    >
                      Go back to eligibility questions
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="progress-wrapper">
                    <div className="progress">
                      <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
                    </div>

                    <div className="steps">
                      <div className={`step-label ${step === 1 ? "active" : ""}`}>1. Verification</div>
                      <div className={`step-label ${step === 2 ? "active" : ""}`}>2. Energy</div>
                      <div className={`step-label ${step === 3 ? "active" : ""}`}>3. Roofs</div>
                      <div className={`step-label ${step === 4 ? "active" : ""}`}>4. System</div>
                      <div className={`step-label ${step === 5 ? "active" : ""}`}>5. Details</div>
                    </div>
                  </div>

                  <div className={quote || loading ? "layout" : "layout-single"}>
                    <div className="form">
                      <div key={step} className="step-content">
                        {/* STEP 1 */}
                        {step === 1 && (
                          <>
                            <h2>✅ Before We Start</h2>

                            <label>
                              <div className="question-label">🏠 Are you the homeowner?</div>
                              <div className="choice-row">
                                <div
                                  className={`choice-pill ${form.homeOwnership === "owner" ? "active" : ""}`}
                                  onClick={() => setForm((prev) => ({ ...prev, homeOwnership: "owner" }))}
                                >
                                  <div className="choice-title">Homeowner</div>
                                  <div className="choice-sub">I own or am buying this property</div>
                                </div>

                                <div
                                  className={`choice-pill ${form.homeOwnership === "renting" ? "active" : ""}`}
                                  onClick={() => setForm((prev) => ({ ...prev, homeOwnership: "renting" }))}
                                >
                                  <div className="choice-title">Renting</div>
                                  <div className="choice-sub">I&apos;m renting this property</div>
                                </div>
                              </div>
                            </label>

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

                            <div className="buttons-row">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!form.homeOwnership) {
                                    setError("Please confirm whether you are the homeowner or renting.");
                                    return;
                                  }

                                  if (form.homeOwnership === "renting") {
                                    setError("");
                                    setRentingBlocked(true);
                                    return;
                                  }

                                  if (!form.houseNumber.trim()) {
                                    setError("Please enter your house name or number.");
                                    return;
                                  }
                                  if (!form.postcode.trim()) {
                                    setError("Please enter your postcode.");
                                    return;
                                  }

                                  if (!isValidUkPostcode(form.postcode)) {
                                    setError("Please enter a valid UK postcode (e.g. SW1A 1AA).");
                                    return;
                                  }

                                  setError("");
                                  setRentingBlocked(false);
                                  handleNext();
                                }}
                              >
                                Next: your home →
                              </button>
                            </div>

                            {error && <div className="error">{error}</div>}
                          </>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                          <>
                            <h2>💡 Your Energy Profile</h2>

                            <label>
                              <div className="question-label">📅 Typical Weekday Occupancy</div>
                              <div className="choice-row">
                                <div
                                  className={`choice-pill ${form.occupancyProfile === "home_all_day" ? "active" : ""}`}
                                  onClick={() => setForm((prev) => ({ ...prev, occupancyProfile: "home_all_day" }))}
                                >
                                  <div className="choice-title">Home all day</div>
                                  <div className="choice-sub">Work from home or retired</div>
                                </div>

                                <div
                                  className={`choice-pill ${form.occupancyProfile === "half_day" ? "active" : ""}`}
                                  onClick={() => setForm((prev) => ({ ...prev, occupancyProfile: "half_day" }))}
                                >
                                  <div className="choice-title">Home half day</div>
                                  <div className="choice-sub">Out most the morning</div>
                                </div>

                                <div
                                  className={`choice-pill ${form.occupancyProfile === "out_all_day" ? "active" : ""}`}
                                  onClick={() => setForm((prev) => ({ ...prev, occupancyProfile: "out_all_day" }))}
                                >
                                  <div className="choice-title">Out all day</div>
                                  <div className="choice-sub">Typical working household</div>
                                </div>
                              </div>
                            </label>

                            <label>
                              <div className="question-label">🔌 Annual electricity use (kWh)</div>
                              <input
                                type="number"
                                name="annualKWh"
                                value={form.annualKWh}
                                onChange={handleChange}
                                placeholder="e.g. 3,000"
                              />
                              <p className="small-print">
                                If you&apos;re not sure, you can check a recent energy bill or leave this blank and we&apos;ll use the average (3500 kWh).
                              </p>
                            </label>

                            <label>
                              <div className="question-label">💷 OR average monthly electricity bill (£)</div>
                              <input
                                type="number"
                                name="monthlyBill"
                                value={form.monthlyBill}
                                onChange={handleChange}
                                placeholder="e.g. 100"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={openTariffModal}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                            >
                              Edit tariff
                            </button>

                            <div className="buttons-row">
                              <button type="button" onClick={handlePrev}>← Back</button>
                              <button type="button" onClick={handleNext}>Next: Roof spaces →</button>
                            </div>
                          </>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                          <>
                            <h2>🏡 Your Roof Spaces</h2>
                            <p className="subheading-print">
                              Add each roof area you want to use. The more accurate you are the more accuratly we can calculate your solar production.
                            </p>

                            {/* Empty state (no roofs yet) */}
                            {roofs.length === 0 && (
                              <div className="roof-empty">
                                <p className="small-print">
                                  You haven&apos;t added any roofs yet. Add at least one to continue.
                                </p>

                                <div className="buttons-row">
                                  <button type="button" onClick={openAddRoofModal}>
                                    + Add a roof
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Summary cards (once roofs exist) */}
                            {roofs.length > 0 && (
                              <>
                                {roofs.map((roof, idx) => (
                                  <div key={roof.id} className="roof-card roof-summary-card">
                                    <div className="roof-summary-header">
                                      <h3 className="roof-title">Roof {idx + 1}</h3>

                                      <div className="roof-summary-actions">
                                        <button
                                          type="button"
                                          className="secondary-mini"
                                          onClick={() => openEditRoofModal(roof)}
                                        >
                                          Edit
                                        </button>

                                        <button
                                          type="button"
                                          className="secondary-mini"
                                          onClick={() =>
                                            setRoofs((prev) => prev.filter((r) => r.id !== roof.id))
                                          }
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>

                                    {(() => {
                                      const thumbs = getRoofThumbsForRoof(roof);

                                      return (
                                        <div className="roof-summary-grid thumbs-grid">
                                          <RoofSummaryRow
                                            label="Orientation"
                                            value={roof.orientation || "—"}
                                            thumbSrc={thumbs.orientation}
                                          />

                                          <RoofSummaryRow
                                            label="Tilt"
                                            value={roof.tilt ? `${roof.tilt}°` : "—"}
                                            thumbSrc={thumbs.tilt}
                                          />

                                          <RoofSummaryRow
                                            label="Shading"
                                            value={roof.shading || "—"}
                                            thumbSrc={thumbs.shading}
                                          />

                                          <RoofSummaryRow
                                            label="Panels"
                                            value={Number.isFinite(Number(roof.panels)) ? roof.panels : "—"}
                                            thumbSrc={thumbs.panels}
                                          />
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ))}

                                <div className="buttons-row">
                                  <button type="button" onClick={openAddRoofModal}>
                                    + Add another roof
                                  </button>
                                </div>
                              </>
                            )}

                            {/* Navigation buttons */}
                            <div className="buttons-row">
                              <button type="button" onClick={handlePrev}>← Back</button>

                              <button
                                type="button"
                                onClick={() => {
                                  // Must have at least one roof
                                  if (!roofs.length) {
                                    setError("Please add at least 1 roof to continue.");
                                    return;
                                  }

                                  // Must have at least 1 panel total (your backend needs this)
                                  const total = roofs.reduce((s, r) => s + Number(r.panels || 0), 0);
                                  if (total <= 0) {
                                    setError("Please enter at least 1 panel across your roof spaces.");
                                    return;
                                  }

                                  setError("");
                                  handleNext();
                                }}
                              >
                                Next: system options →
                              </button>
                            </div>

                            {error && <div className="error">{error}</div>}
                          </>
                        )}


                        {/* STEP 4 */}
                        {step === 4 && (
                          <>
                            <h2>⚡ Your System Options</h2>

                            <label>
                              <div className="question-label">🏷️ Panel Type</div>
                              <select name="panelOption" value={form.panelOption} onChange={handleChange}>
                                <option value="value">Good value (≈430 W)</option>
                                <option value="premium">Premium (≈460 W)</option>
                              </select>
                              <p className="small-print">
                                Standard panels will be an older model, have lower output but are cheaper. 
                                Premium panels use the latest tech to maximise output but cost 10-15% more.
                              </p>
                            </label>

                            <label>
                              <div className="question-label">🔋 Usable Battery Capacity (kWh)</div>
                              <input
                                type="number"
                                name="batteryKWh"
                                value={form.batteryKWh}
                                onChange={handleChange}
                                placeholder="e.g. 5, 10 or 13"
                              />
                              <p className="small-print">
                                Enter the <strong>usable</strong> battery capacity.
                                If you’re unsure: 5 kWh (small), 9 kWh (medium), 13–15 kWh (large).
                              </p>
                            </label>

                            <div className="checkbox-heading">➕ Optional Extras:</div>
                            <label className="checkbox">
                              <input
                                type="checkbox"
                                name="birdProtection"
                                checked={form.birdProtection}
                                onChange={handleChange}
                              />
                              <span>Include bird protection</span>
                            </label>

                            <label className="checkbox">
                              <input
                                type="checkbox"
                                name="evCharger"
                                checked={form.evCharger}
                                onChange={handleChange}
                              />
                              <span>Include EV charger</span>
                            </label>

                            <div className="buttons-row">
                              <button type="button" onClick={handlePrev}>← Back</button>
                              <button type="button" onClick={handleNext}>Next: your details →</button>
                            </div>
                          </>
                        )}

                        {/* STEP 5 */}
                        {step === 5 && (
                          <>
                            <h2>👋 Your details</h2>
                            <p className="text-sm text-slate-500">
                              Optional — You can skip this for now, as its just to pre-fill your next steps!
                            </p>

                            <label>
                              <div className="question-label">Full name</div>
                              <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Your name"
                              />
                            </label>

                            <label>
                              <div className="question-label">Email address</div>
                              <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                              />
                            </label>

                            <label>
                              <div className="question-label">Phone number (optional)</div>
                              <input
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="For follow-up questions"
                              />
                            </label>

                            <div className="buttons-row">
                              <button type="button" onClick={handlePrev}>← Back</button>
                              <button type="button" onClick={handleSubmit} disabled={loading}>
                                {loading ? "Calculating…" : "Get my quote"}
                              </button>
                            </div>

                            {error && <div className="error">{error}</div>}
                          </>
                        )}
                      </div>

                      {/* ===========================
                            ROOF WIZARD MODAL (Quiz)
                          =========================== */}
                        <RoofWizardModal
                          open={roofModalOpen}
                          editingRoofId={editingRoofId}
                          roofWizardStep={roofWizardStep}
                          setRoofWizardStep={setRoofWizardStep}
                          draftRoof={draftRoof}
                          setDraftRoof={setDraftRoof}
                          error={error}
                          setError={setError}
                          onClose={closeRoofModal}
                          onSave={saveRoofFromDraft}
                        />
                    </div>

                    {page !== "quote" && (quote || loading) && (
                      <div className="result">
                        {loading && (
                          <div className="loading-card">
                            <div className="loading-header">
                              <div className="loading-spinner" />
                              <p className="loading-title">Calculating your estimate…</p>
                            </div>
                            <ul className="loading-list">
                              <li>Matching your energy use to a suitable system size…</li>
                              <li>Estimating annual generation for your roof…</li>
                              <li>Building a price range for panels, battery and extras…</li>
                            </ul>
                            <p className="loading-subtitle">This usually takes just a moment.</p>
                          </div>
                        )}

                        {!loading && quote && (
                          <div className="quote-card">
                            <h2>Your Current Quote</h2>

                            <p className="headline">
                              Estimated price: <strong>£{quote.priceLow.toLocaleString()}</strong> –{" "}
                              <strong>£{quote.priceHigh.toLocaleString()}</strong>
                            </p>

                            <div className="quote-stats">
                              <div className="quote-stat">
                                <div className="quote-stat-label">System size</div>
                                <div className="quote-stat-value">{quote.systemSizeKwp} kWp</div>
                              </div>

                              <div className="quote-stat">
                                <div className="quote-stat-label">Total annual benefit</div>
                                <div className="quote-stat-value">
                                  £{quote.totalAnnualBenefit ? quote.totalAnnualBenefit.toLocaleString() : "0"}
                                </div>
                              </div>

                              <div className="quote-stat">
                                <div className="quote-stat-label">Projected payback</div>
                                <div className="quote-stat-value">
                                  {quote?.financialSeries?.payback?.paybackYear ? `${quote.financialSeries.payback.paybackYear} yrs` : "N/A"}
                                </div>
                              </div>
                            </div>

                            <p>
                              Estimated annual generation:{" "}
                              <strong>{quote.estAnnualGenerationKWh.toLocaleString()} kWh</strong>
                            </p>

                            <p>
                              Battery:{" "}
                              <strong>{form.batteryKWh ? `${form.batteryKWh} kWh` : "No battery selected"}</strong>
                            </p>

                            <p>
                              Extras:{" "}
                              <strong>
                                {form.birdProtection ? "Bird protection" : "No bird protection"}
                                {form.evCharger ? (form.birdProtection ? " + EV charger" : "EV charger") : ""}
                              </strong>
                            </p>

                            <h4>Financial summary</h4>

                            <p>
                              Annual bill saving:{" "}
                              <strong>£{quote.annualBillSavings ? quote.annualBillSavings.toLocaleString() : "0"}</strong>
                            </p>

                            <p>
                              Annual SEG income:{" "}
                              <strong>£{quote.annualSegIncome ? quote.annualSegIncome.toLocaleString() : "0"}</strong>
                            </p>

                            <p>
                              Total estimated annual benefit:{" "}
                              <strong>£{quote.totalAnnualBenefit ? quote.totalAnnualBenefit.toLocaleString() : "0"}</strong>
                            </p>

                        

                            <div className="quote-cta">
                              <p>Like the look of this? We can firm this up with a free, no-obligation survey.</p>
                              <a
                                href={`mailto:${CONTACT_EMAIL}?subject=Solar estimate follow-up`}
                                className="cta-link"
                              >
                                <button type="button">Book a free survey by email</button>
                              </a>
                            </div>

                            <p className="disclaimer">
                              This is a rough estimate only and not a formal quote. Final pricing depends on a site
                              survey, roof details, and exact equipment choices.
                            </p>

                            <p className="small-print">
                              Self-consumption model: <strong>{quote.selfConsumptionModel}</strong>
                            </p>
                          </div>
                        )}
                      </div>
                      
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
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
        onClose={() => setTariffModalOpen(false)}
        onSave={saveTariffFromDraft}
      />

      <footer className="site-footer">
        {PLATFORM.toolName} estimate tool •{" "}
        {INSTALLER ? (
          <>
            Estimate provided by <strong>{INSTALLER.name}</strong>
          </>
        ) : (
          "Providing realistic Solar estimates - Connecting homeowners with installers"
        )}
      </footer>
    </div>
  );
}

export default App;
