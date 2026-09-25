import React from "react";

import { ACTIVE_BRAND, PLATFORM } from "../config/siteConfig";

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

import {
    buildConfirmedPostalAddress,
} from "../utils/selectedAddressUtils";

import SolarTargetBuildingSelector from "./roof/SolarTargetBuildingSelector";

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

  const brandName = ACTIVE_BRAND.name;
  const brandInitials =
    ACTIVE_BRAND.initials || brandName.slice(0, 2).toUpperCase();
  const brandLogo = ACTIVE_BRAND.assets?.logo || null;

  return (
    <>
        <div className="mobile-tool-topbar">
            <button type="button" className="mobile-home-button" onClick={goToHome}>
            ← Home
            </button>
        </div>

        {!rentingBlocked && (
            <div className="w-full bg-white px-4 pb-2 pt-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        {brandLogo ? (
                            <img
                                src={brandLogo}
                                alt={`${brandName} logo`}
                                className="h-10 w-10 object-contain"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
                                {brandInitials}
                            </div>
                        )}

                        <div>
                            <div className="text-sm font-semibold text-ink">
                                {brandName}
                            </div>
                            <div className="text-xs text-slate-500">
                                Your solar estimate
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500 sm:text-right">
                        Powered by{" "}
                        <span className="font-semibold text-brand">
                            {PLATFORM.toolName}
                        </span>
                    </div>
                </div>
            </div>
        )}

        <section
            className={`tool-section ${
                !rentingBlocked ? "tool-section--branded" : ""
            }`}
        >
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
                    <div className={`step-label ${step === 1 ? "active" : ""}`}>1. Your home</div>
                    <div className={`step-label ${step === 2 ? "active" : ""}`}>2. Energy usage</div>
                    <div className={`step-label ${step === 3 ? "active" : ""}`}>3. Your roof</div>
                    <div className={`step-label ${step === 4 ? "active" : ""}`}>4. Your system</div>
                    <div className={`step-label ${step === 5 ? "active" : ""}`}>5. Your details</div>
                    </div>
                </div>

                <div className={quote || loading ? "layout" : "layout-single"}>
                    <div className="form">
                    <div key={step} className="step-content">
                        {/* STEP 1 */}
                        {step === 1 && (
                        <>
                            <h2 className="step-title">
                                <span className="step-title-icon" aria-hidden="true">🏠</span>
                                <span>Your Home</span>
                            </h2>

                            <p className="subheading-print">
                                Tell us where the solar system will be installed.
                            </p>

                            {/* PROPERTY OWNERSHIP */}
                            <div className="mt-4">
                                <div className="form-section-label">Do you own the property?</div>

                                <div className="choice-row">
                                    <button
                                        type="button"
                                        className={`choice-pill ${
                                            form.homeOwnership === "owner"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                homeOwnership: "owner",
                                            }))
                                        }
                                    >
                                        <div className="choice-title">
                                            Homeowner
                                        </div>

                                        <div className="choice-sub">
                                            I own or am buying the property
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        className={`choice-pill ${
                                            form.homeOwnership === "renting"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                homeOwnership: "renting",
                                            }))
                                        }
                                    >
                                        <div className="choice-title">
                                            Renting
                                        </div>

                                        <div className="choice-sub">
                                            I rent the property
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* ADDRESS SEARCH */}
                            <div className="mt-4">
                                <GooglePlacesAddressLookup
                                    form={form}
                                    setForm={setForm}
                                    handleChange={handleChange}
                                    handlePostcodeChange={
                                        handlePostcodeChange
                                    }
                                    setError={setError}
                                    setRoofGeometry={(nextGeometry) => {
                                        setRoofGeometry(nextGeometry);

                                        if (nextGeometry === null) {
                                            setRoofs([]);
                                            setRoofInputMode(
                                                "draw_my_roof"
                                            );
                                        }
                                    }}
                                />
                            </div>

                            {/* CHECK SELECTED PROPERTY */}
                            {form.selectedAddress && (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="form-section-label">Check Your Details</div>

                                            <p className="mt-1 text-sm text-slate-600">
                                                We found this property. Check the details before continuing.
                                            </p>

                                            {form.selectedAddress?.fullAddress && (
                                                <p className="mt-2 text-sm font-medium text-slate-900">
                                                    {form.selectedAddress.fullAddress}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className="secondary-mini shrink-0"
                                            onClick={() => {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    address: "",
                                                    houseNumber: "",
                                                    roadName: "",
                                                    town: "",
                                                    postcode: "",
                                                    selectedAddress: null,
                                                    propertyType: "unknown",
                                                }));

                                                setRoofGeometry(null);
                                                setRoofs([]);
                                                setRoofInputMode(
                                                    "draw_my_roof"
                                                );
                                                setError("");
                                            }}
                                        >
                                            Change address
                                        </button>
                                    </div>

                                    <div className="property-details-grid mt-3 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                                        <label>
                                            <div className="question-label">
                                                House number / name
                                            </div>

                                            <input
                                                type="text"
                                                name="houseNumber"
                                                value={form.houseNumber}
                                                onChange={handleChange}
                                            />
                                        </label>

                                        <label>
                                            <div className="question-label">
                                                Road name
                                            </div>

                                            <input
                                                type="text"
                                                name="roadName"
                                                value={form.roadName}
                                                onChange={handleChange}
                                            />
                                        </label>

                                        <label>
                                            <div className="question-label">
                                                Town / city
                                            </div>

                                            <input
                                                type="text"
                                                name="town"
                                                value={form.town}
                                                onChange={handleChange}
                                            />
                                        </label>

                                        <label>
                                            <div className="question-label">
                                                Postcode
                                            </div>

                                            <input
                                                type="text"
                                                name="postcode"
                                                value={form.postcode}
                                                onChange={
                                                    handlePostcodeChange
                                                }
                                            />
                                        </label>

                                        <label className="md:col-span-2">
                                            <div className="question-label">
                                                Property type
                                            </div>

                                            <select
                                                name="propertyType"
                                                value={
                                                    form.propertyType ||
                                                    "unknown"
                                                }
                                                onChange={(event) => {
                                                    const nextPropertyType =
                                                        event.target.value;

                                                    setForm((prev) => ({
                                                        ...prev,
                                                        propertyType:
                                                            nextPropertyType,
                                                    }));

                                                    // Property type affects the
                                                    // boundary workflow, so any
                                                    // existing roof analysis
                                                    // must be invalidated.
                                                    setRoofGeometry(null);
                                                    setRoofs([]);
                                                    setRoofInputMode(
                                                        "draw_my_roof"
                                                    );
                                                    setError("");
                                                }}
                                            >
                                                <option value="unknown">
                                                    Select property type
                                                </option>

                                                <option value="detached">
                                                    Detached house
                                                </option>

                                                <option value="semi_detached">
                                                    Semi-detached house
                                                </option>

                                                <option value="mid_terrace">
                                                    Mid-terrace house
                                                </option>

                                                <option value="end_terrace">
                                                    End-terrace house
                                                </option>

                                                <option value="bungalow">
                                                    Bungalow
                                                </option>

                                                <option value="commercial_or_other">
                                                    Commercial / other
                                                </option>
                                            </select>

                                            <p className="small-print">
                                                For attached homes, we may ask you to mark the boundary with your neighbour.
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            )}

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
                                        setError("Please search for and select the closest matching address before continuing.");
                                        return;
                                    }

                                    if (
                                        form.selectedAddress.latitude === null ||
                                        form.selectedAddress.longitude === null
                                    ) {
                                        setError("The selected address does not have map coordinates. Please choose another address result.");
                                        return;
                                    }
                                }

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

                                if (!isValidUkPostcode(form.postcode)) {
                                    setError("Please enter a valid UK postcode (e.g. SW1A 1AA).");
                                    return;
                                }

                                if (
                                    !form.propertyType ||
                                    form.propertyType === "unknown"
                                ) {
                                    setError("Please select your property type.");
                                    return;
                                }

                                setError("");
                                setRentingBlocked(false);
                                handleNext();
                                }}
                            >
                                Next: energy usage →
                            </button>
                            </div>

                            {error && <div className="error">{error}</div>}
                        </>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                        <>
                            <h2 className="step-title">
                                <span className="step-title-icon" aria-hidden="true">⚡</span>
                                <span>Energy Usage</span>
                            </h2>

                            <p className="subheading-print">
                                A few details help us estimate how your home uses electricity.
                            </p>

                            <div className="energy-occupancy">
                                <div className="form-section-label">When is someone usually at home?</div>

                                <div className="choice-row">
                                    <button
                                        type="button"
                                        className={`choice-pill ${
                                            form.occupancyProfile === "home_all_day"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                occupancyProfile: "home_all_day",
                                            }))
                                        }
                                    >
                                        <div className="choice-title">
                                            Home all day
                                        </div>

                                        <div className="choice-sub">
                                            Usually occupied during the day
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        className={`choice-pill ${
                                            form.occupancyProfile === "half_day"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                occupancyProfile: "half_day",
                                            }))
                                        }
                                    >
                                        <div className="choice-title">
                                            Home half day
                                        </div>

                                        <div className="choice-sub">
                                            Occupied for part of the day
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        className={`choice-pill ${
                                            form.occupancyProfile === "out_all_day"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                occupancyProfile: "out_all_day",
                                            }))
                                        }
                                    >
                                        <div className="choice-title">
                                            Out all day
                                        </div>

                                        <div className="choice-sub">
                                            Usually empty during working hours
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="energy-usage-card">
                                <div className="form-section-label">Electricity Usage</div>

                                <p className="form-section-copy">
                                    Enter your annual electricity use if you know it.
                                </p>

                                <label className="energy-primary-field">
                                    <div className="energy-field-label">
                                        Annual electricity usage
                                    </div>

                                    <div className="energy-input-wrap">
                                        <input
                                            type="number"
                                            name="annualKWh"
                                            value={form.annualKWh}
                                            onChange={handleChange}
                                            placeholder="e.g. 3000"
                                        />

                                        <span>kWh/year</span>
                                    </div>
                                </label>

                                <details className="energy-alternative">
                                    <summary>
                                        Don&apos;t know your annual usage? Use your average monthly bill
                                    </summary>

                                    <div className="energy-alternative-body">
                                        <label>
                                            <div className="energy-field-label">
                                                Average monthly electricity bill
                                            </div>

                                            <div className="energy-input-wrap energy-input-wrap--money">
                                                <span>£</span>

                                                <input
                                                    type="number"
                                                    name="monthlyBill"
                                                    value={form.monthlyBill}
                                                    onChange={handleChange}
                                                    placeholder="e.g. 100"
                                                />

                                                <span>/month</span>
                                            </div>
                                        </label>
                                    </div>
                                </details>
                            </div>

                            <div className="energy-tariff-row">
                                <div>
                                    <div className="form-section-label">Electricity Tariff</div>

                                    <p className="form-section-copy">
                                        Review the electricity prices used in your estimate.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={openTariffModal}
                                    className="energy-tariff-button"
                                >
                                    Edit tariff
                                </button>
                            </div>

                            <div className="buttons-row">
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                >
                                    ← Back
                                </button>

                                <button
                                    type="button"
                                    onClick={handleNext}
                                >
                                    Next: your roof →
                                </button>
                            </div>
                        </>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                        <>
                            <h2 className="step-title">
                                <span className="step-title-icon" aria-hidden="true">☀️</span>
                                <span>Your Roof</span>
                            </h2>
                            <p className="subheading-print">
                                We&apos;ll use satellite data to estimate the roof areas most suitable for solar.
                            </p>

                            {roofInputMode === "draw_my_roof" && (
                            <>
                                <SolarTargetBuildingSelector
                                    selectedAddress={form.selectedAddress}
                                    propertyType={form.propertyType || "unknown"}
                                    addressContext={{
                                        houseNumber: form.houseNumber || "",
                                        roadName: form.roadName || "",
                                        town: form.town || "",
                                        postcode: form.postcode || "",
                                        addressLine:
                                        buildConfirmedPostalAddress(form) ||
                                        form.selectedAddress?.fullAddress ||
                                        form.address ||
                                        "",
                                        selectedAddress: form.selectedAddress || null,
                                        country: "GB",
                                    }}
                                    value={roofGeometry}
                                    onChange={setRoofGeometry}
                                    hasCalculationRoofs={roofs.length > 0}
                                    calculationRoofs={roofs}
                                    onUseCalculationRoofEstimate={(estimatedRoofs) => {
                                        setRoofs(estimatedRoofs);
                                        setError("");
                                    }}
                                />

                                <div className="mt-4 border-t border-slate-100 pt-3">
                                    <p className="text-xs text-slate-500">
                                        Having trouble with the satellite view?
                                    </p>

                                    <button
                                        type="button"
                                        className="secondary-mini mt-2"
                                        onClick={() => {
                                            setRoofInputMode("panel_count");
                                            setRoofGeometry(null);
                                            setRoofs([]);
                                            setError("");
                                        }}
                                    >
                                        Enter roof details manually
                                    </button>
                                </div>
                            </>
                            )}

                            {roofInputMode === "panel_count" && (
                                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                Manual roof estimate
                                            </p>

                                            <p className="mt-1 text-sm text-slate-600">
                                                Add the roof areas and approximate panel
                                                numbers you already know.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            className="secondary-mini"
                                            onClick={() => {
                                                setRoofInputMode("draw_my_roof");
                                                setRoofGeometry(null);
                                                setRoofs([]);
                                                setError("");
                                            }}
                                        >
                                            Try satellite view again
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Empty state (no editable calculation roof estimate yet) */}
                            {roofInputMode === "panel_count" && roofs.length === 0 && (
                            <div className="roof-empty">
                                <p className="small-print">
                                No roof areas have been added yet.
                                Add a roof area to continue.
                                </p>

                                <div className="buttons-row">
                                <button type="button" onClick={openAddRoofModal}>
                                    + Add roof details
                                </button>
                                </div>
                            </div>
                            )}

                            {/* Summary cards (manual roof mode only) */}
                            {roofInputMode === "panel_count" && roofs.length > 0 && (
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
                                    + Add another roof area
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
                                    const hasSolarTargetBuildings =
                                    Array.isArray(roofGeometry?.solarTargetBuildings) &&
                                    roofGeometry.solarTargetBuildings.length > 0;

                                    if (!hasSolarTargetBuildings) {
                                    setError("Please select at least one building roof on the map before continuing.");
                                    return;
                                    }
                                }

                                if (!roofs.length) {
                                    setError(
                                    roofInputMode === "draw_my_roof"
                                        ? "Please confirm your selected roof layout before continuing."
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
                                Next: choose your system →
                            </button>
                            </div>

                            {error && <div className="error">{error}</div>}
                        </>
                        )}


                        {/* STEP 4 */}
                        {step === 4 && (
                        <>
                            <h2 className="step-title">
                                <span className="step-title-icon" aria-hidden="true">🔋</span>
                                <span>Your System</span>
                            </h2>
                            <p className="subheading-print">
                                Choose your preferences and we&apos;ll tailor the estimate.
                            </p>

                            <div className="form-section-label">Panels</div>
                            <p className="small-print">
                                Choose our standard option or higher-output panels where roof space is more limited.
                            </p>
                            <div className="choice-row">
                                <button
                                    type="button"
                                    className={`choice-pill ${form.panelOption === "value" ? "active" : ""}`}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            panelOption: "value",
                                        }))
                                    }
                                >
                                    <div className="choice-title">Standard</div>
                                    <div className="choice-sub">
                                        Our usual high-quality option
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className={`choice-pill ${form.panelOption === "premium" ? "active" : ""}`}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            panelOption: "premium",
                                        }))
                                    }
                                >
                                    <div className="choice-title">Premium</div>
                                    <div className="choice-sub">
                                        Higher output where space matters
                                    </div>
                                </button>
                            </div>

                            <div className="form-section-label">Battery</div>
                            <p className="small-print">
                                We&apos;ll compare battery sizes using your solar generation, electricity use and tariff.
                            </p>
                            <div className="choice-row">
                                <button
                                    type="button"
                                    className={`choice-pill ${
                                        (form.batteryChoiceMode || "recommend") === "recommend"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            batteryChoiceMode: "recommend",
                                            batteryStrategy: "balanced",
                                            batteryKWh: 0,
                                        }))
                                    }
                                >
                                    <div className="choice-title">
                                        Recommend for me
                                    </div>
                                    <div className="choice-sub">
                                        We&apos;ll find the best balance
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className={`choice-pill ${
                                        form.batteryChoiceMode === "none"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            batteryChoiceMode: "none",
                                            batteryKWh: 0,
                                        }))
                                    }
                                >
                                    <div className="choice-title">
                                        No battery
                                    </div>
                                    <div className="choice-sub">
                                        Solar panels only
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className={`choice-pill ${
                                        form.batteryChoiceMode === "custom"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            batteryChoiceMode: "custom",
                                            batteryKWh:
                                                Number(prev.batteryCustomKWh) > 0
                                                    ? Number(prev.batteryCustomKWh)
                                                    : 10,
                                            batteryCustomKWh:
                                                Number(prev.batteryCustomKWh) > 0
                                                    ? Number(prev.batteryCustomKWh)
                                                    : 10,
                                        }))
                                    }
                                >
                                    <div className="choice-title">
                                        Choose a size
                                    </div>
                                    <div className="choice-sub">
                                        If you already know what you want
                                    </div>
                                </button>
                            </div>

                            {form.batteryChoiceMode === "custom" && (
                                <label className="mt-3">
                                    <div className="question-label">
                                        Battery size
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            name="batteryKWh"
                                            min="1"
                                            max="35"
                                            step="1"
                                            value={
                                                form.batteryCustomKWh ??
                                                form.batteryKWh ??
                                                10
                                            }
                                            onChange={(event) => {
                                                const value = event.target.value;

                                                setForm((prev) => ({
                                                    ...prev,
                                                    batteryCustomKWh: value,
                                                    batteryKWh: value,
                                                }));
                                            }}
                                            placeholder="e.g. 10"
                                        />
                                        <span className="text-sm font-medium text-slate-600">
                                            kWh
                                        </span>
                                    </div>
                                </label>
                            )}

                            <div className="form-section-label">Optional Extras</div>
                            <p className="small-print">
                                Add anything else you&apos;d like included in your estimate.
                            </p>

                            <div className="choice-row">
                                <button
                                    type="button"
                                    className={`choice-pill ${form.birdProtection ? "active" : ""}`}
                                    aria-pressed={!!form.birdProtection}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            birdProtection: !prev.birdProtection,
                                        }))
                                    }
                                >
                                    <div className="choice-title">
                                        Bird protection
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className={`choice-pill ${form.evCharger ? "active" : ""}`}
                                    aria-pressed={!!form.evCharger}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            evCharger: !prev.evCharger,
                                        }))
                                    }
                                >
                                    <div className="choice-title">
                                        EV charger
                                    </div>
                                </button>
                            </div>

                            <div className="buttons-row">
                                <button type="button" onClick={handlePrev}>
                                    ← Back
                                </button>

                                <button
                                    type="button"
                                    className="next-step-button"
                                    onClick={() => {
                                        if (form.batteryChoiceMode === "custom") {
                                            const customBatteryKWh = Number(
                                                form.batteryCustomKWh ??
                                                form.batteryKWh ??
                                                0
                                            );

                                            if (
                                                !Number.isInteger(customBatteryKWh) ||
                                                customBatteryKWh < 1 ||
                                                customBatteryKWh > 35
                                            ) {
                                                setError(
                                                    "Please enter a whole battery size between 1 and 35 kWh."
                                                );
                                                return;
                                            }
                                        }

                                        setError("");
                                        handleNext();
                                    }}
                                >
                                    Next: your details →
                                </button>
                            </div>

                            {error && <div className="error">{error}</div>}
                        </>
                        )}

                        {/* STEP 5 */}
                        {step === 5 && (
                        <>
                            <h2 className="step-title">
                                <span className="step-title-icon" aria-hidden="true">👤</span>
                                <span>Your Details</span>
                            </h2>

                            <p className="subheading-print">
                                Optional — you can view your estimate without entering any details.
                            </p>

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <label>
                                        <div className="question-label">
                                            Full name
                                        </div>

                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            placeholder="Your name"
                                            autoComplete="name"
                                        />
                                    </label>

                                    <label>
                                        <div className="question-label">
                                            Email address
                                        </div>

                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                        />
                                    </label>

                                    <label>
                                        <div className="question-label">
                                            Phone number
                                        </div>

                                        <input
                                            type="tel"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="e.g. 07123 456789"
                                            autoComplete="tel"
                                        />
                                    </label>
                                </div>
                            </div>

                            <LegalNotice
                                variant="compact"
                                className="mt-4"
                            />

                            <div className="buttons-row">
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                >
                                    ← Back
                                </button>

                                <button
                                    type="button"
                                    className="next-step-button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Calculating…"
                                        : "See my solar estimate →"}
                                </button>
                            </div>

                            {error && (
                                <div className="error">
                                    {error}
                                </div>
                            )}
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

