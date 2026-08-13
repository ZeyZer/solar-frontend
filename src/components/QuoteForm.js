import React from "react";

import {
  isValidUkPostcode,
} from "../utils/postcodeUtils";

import {
  getRoofThumbsForRoof,
  RoofSummaryRow,
} from "./RoofWizardHelpers";

import RoofWizardModal from "./RoofWizardModal";

import LegalNotice from "./LegalNotice";

import GooglePlacesAddressLookup from "./address/GooglePlacesAddressLookup";

import DrawMyRoofMap from "./roof/DrawMyRoofMap";
import RoofInputModeSelector from "./roof/RoofInputModeSelector";

import {
  validateRoofGeometryPayload,
} from "../utils/roofGeometryPayload";

export default function QuoteForm({
  // navigation/state
  step,
  setStep,
  progressPercent,
  rentingBlocked,
  setRentingBlocked,

  // form
  form,
  setForm,
  handleChange,
  handlePostcodeChange,
  handleNext,
  handlePrev,
  handleSubmit,

  // errors/loading
  error,
  setError,
  loading,

  // quote preview
  quote,
  contactEmail,

  // tariff
  openTariffModal,

  // roofs
  roofs,
  setRoofs,
  roofInputMode,
  setRoofInputMode,
  roofGeometry,
  setRoofGeometry,
  openAddRoofModal,
  openEditRoofModal,

  // roof modal
  roofModalOpen,
  editingRoofId,
  roofWizardStep,
  setRoofWizardStep,
  draftRoof,
  setDraftRoof,
  closeRoofModal,
  saveRoofFromDraft,

  // topbar
  goToHome,
}) {
  return (
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

                            <GooglePlacesAddressLookup
                                form={form}
                                setForm={setForm}
                                handleChange={handleChange}
                                handlePostcodeChange={handlePostcodeChange}
                                setError={setError}
                                setRoofGeometry={setRoofGeometry}
                            />

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

                                if (process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
                                    if (!form.selectedAddress) {
                                        setError("Please search for and select your address before continuing.");
                                        return;
                                    }

                                    if (
                                        form.selectedAddress.latitude === null ||
                                        form.selectedAddress.longitude === null
                                    ) {
                                        setError("The selected address does not have map coordinates. Please choose another address result.");
                                        return;
                                    }
                                } else {
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
                            Add each roof area you want to use. The more accurate you are,
                            the more accurately we can estimate your solar production.
                            </p>

                            <RoofInputModeSelector
                                value={roofInputMode}
                                onChange={(nextMode) => {
                                setRoofInputMode(nextMode);
                                setRoofGeometry(null);
                                setError("");
                                }}
                            />

                            {roofInputMode === "draw_my_roof" && (
                            <>
                                <DrawMyRoofMap
                                    postcode={form.postcode}
                                    selectedAddress={form.selectedAddress}
                                    addressContext={{
                                        postcode: form.postcode,
                                        addressLine:
                                        form.selectedAddress?.fullAddress ||
                                        form.address ||
                                        `${form.houseNumber || ""} ${form.postcode || ""}`.trim(),
                                        selectedAddress: form.selectedAddress || null,
                                        country: "GB",
                                    }}
                                    value={roofGeometry}
                                    onChange={setRoofGeometry}
                                />

                                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                                <p className="font-semibold">Current MVP limitation</p>
                                <p className="mt-1">
                                    Your drawn roof area will be saved and sent to the backend as
                                    roof geometry. For this version of the quote calculator, please
                                    also add an estimated panel count below so the existing calculation
                                    engine can still run safely.
                                </p>
                                </div>
                            </>
                            )}

                            {roofInputMode === "panel_count" && (
                            <p className="small-print">
                                This is the fastest option. It uses your estimated number of panels
                                as the basis for the current quote calculation.
                            </p>
                            )}

                            {/* Empty state (no roof panel-count estimate yet) */}
                            {roofs.length === 0 && (
                            <div className="roof-empty">
                                <p className="small-print">
                                You haven&apos;t added a roof panel-count estimate yet.
                                Add at least one roof estimate to continue.
                                </p>

                                <div className="buttons-row">
                                <button type="button" onClick={openAddRoofModal}>
                                    + Add a roof estimate
                                </button>
                                </div>
                            </div>
                            )}

                            {/* Summary cards (once roof panel-count estimates exist) */}
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
                                    + Add another roof estimate
                                </button>
                                </div>
                            </>
                            )}

                            <div className="buttons-row">
                            <button type="button" onClick={handlePrev}>← Back</button>

                            <button
                                type="button"
                                onClick={() => {
                                if (roofInputMode === "draw_my_roof") {
                                    const roofGeometryErrors =
                                    validateRoofGeometryPayload(roofGeometry);

                                    if (roofGeometryErrors.length > 0) {
                                    setError(roofGeometryErrors[0]);
                                    return;
                                    }
                                }

                                if (!roofs.length) {
                                    setError(
                                    roofInputMode === "draw_my_roof"
                                        ? "Please also add an estimated panel count below so the current quote calculation can run."
                                        : "Please add at least 1 roof to continue."
                                    );
                                    return;
                                }

                                const total = roofs.reduce(
                                    (s, r) => s + Number(r.panels || 0),
                                    0
                                );

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
                            Optional — you can skip this for now, as it&apos;s just to pre-fill your next steps!
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

                            <LegalNotice variant="compact" className="mt-4" />

                            <div className="buttons-row">
                            <button type="button" onClick={handlePrev}>
                                ← Back
                            </button>

                            <button type="button" onClick={handleSubmit} disabled={loading}>
                                {loading ? "Calculating…" : "Generate my quote"}
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

                    {(quote || loading) && (
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
                                href={`mailto:${contactEmail}?subject=Solar estimate follow-up`}
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
  );
}

