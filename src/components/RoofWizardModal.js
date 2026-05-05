import React from "react";

import {
  StepHeader,
  ConfidenceNote,
} from "./AppUiHelpers";

import {
  RoofWizardHeroImage,
} from "./RoofWizardHelpers";

const ROOF_PANEL_PRESETS = {
  small: 6,
  medium: 10,
  large: 14,
};

export default function RoofWizardModal({
  open,
  editingRoofId,
  roofWizardStep,
  setRoofWizardStep,
  draftRoof,
  setDraftRoof,
  error,
  setError,
  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
            <div>
                <h3 style={{ margin: 0 }}>
                {editingRoofId ? "Edit roof" : "Add a roof"}
                </h3>
                <p className="small-print" style={{ marginTop: 6 }}>
                Question {roofWizardStep + 1} of 4
                </p>
            </div>

            <button type="button" className="modal-close" onClick={onClose}>
                ✕
            </button>
            </div>

            {/* STEP 1: Orientation */}
            {roofWizardStep === 0 && (
            <>
                <StepHeader
                title="Which Direction Does This Roof Face?"
                subtitle="Try and pick the closest direction as the orientation of your panels does have a big effect 
                on the amount of light energy (irradiance) that hits them and therefore the amount of power your panels produce"
                />

                <RoofWizardHeroImage stepIndex={roofWizardStep} draftRoof={draftRoof} />

                <label>
                <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-h3 text-center text-slate-900"
                    value={draftRoof.orientation}
                    onChange={(e) =>
                    setDraftRoof((prev) => ({ ...prev, orientation: e.target.value }))
                    }
                >
                    <option value="">Select…</option>
                    <option value="N">North</option>
                    <option value="NE">North-East</option>
                    <option value="E">East</option>
                    <option value="SE">South-East</option>
                    <option value="S">South</option>
                    <option value="SW">South-West</option>
                    <option value="W">West</option>
                    <option value="NW">North-West</option>
                </select>
                </label>

                <ConfidenceNote title="Unsure about the direction?">
                You can always use your phone compass. A close guess is fine — you can edit it later.
                </ConfidenceNote>
            </>
            )}

            {/* STEP 2: TILT */}
            {roofWizardStep === 1 && (
            <>
                <StepHeader
                title="How Steep Is The Roof?"
                subtitle="Choose the closest match. Tilt affects yearly output a bit, but for this estimate it doesn’t need to be exact. 
                At current this quote tool doesn't cater for flat roof systems."
            
                />

                <RoofWizardHeroImage stepIndex={roofWizardStep} draftRoof={draftRoof} />

                <label>
            
                <div className="choice-row">
                    {[
                    { label: "Shallow (20–30°)", value: 25 },
                    { label: "Standard (30–45°)", value: 40 },
                    { label: "Steep (45–60°)", value: 55 },
                    ].map((opt) => (
                    <div
                        key={opt.value}
                        className={`choice-pill ${
                        Number(draftRoof.tilt) === opt.value ? "active" : ""
                        }`}
                        onClick={() =>
                        setDraftRoof((prev) => ({ ...prev, tilt: opt.value }))
                        }
                    >
                        <div className="choice-title">{opt.label}</div>
                    </div>
                    ))}
                </div>
                </label>

                <ConfidenceNote title="Good enough is good enough">
                Most roofs fall into the “Standard” range. Pick the closest — an installer survey can confirm later.
                </ConfidenceNote>
            </>
            )}


            {/* STEP 3: SHADING */}
            {roofWizardStep === 2 && (
            <>
                <StepHeader
                title="How Shaded Is This Roof?"
                subtitle="Shading reduces output — we use this to adjust the estimate. If the roof is completely shaded by
                trees or a nearby building it might be better to avoid using this roof entirely!"
                />

                <RoofWizardHeroImage stepIndex={roofWizardStep} draftRoof={draftRoof} />

                <label>
                <div className="choice-row">
                    {[
                    { label: "None", value: "none", sub: "Completely unshaded" },
                    { label: "Some", value: "some", sub: "Partially shaded for SOME of the day"},
                    { label: "Quite a lot", value: "a_lot", sub: "Partially shaded for MOST of the day"},
                    ].map((opt) => (
                    <div
                        key={opt.value}
                        className={`choice-pill ${
                        draftRoof.shading === opt.value ? "active" : ""
                        }`}
                        onClick={() =>
                        setDraftRoof((prev) => ({ ...prev, shading: opt.value }))
                        }
                    >
                        <div className="choice-title">{opt.label}</div>
                        <div className="choice-sub">{opt.sub}</div>
                    </div>
                    ))}
                </div>
                </label>

                <ConfidenceNote title="What counts as shading?">
                Trees, chimneys, and nearby buildings. If it’s shaded for part of the day, choose “Some”.
                </ConfidenceNote>
            </>
            )}

            {/* STEP 4: SIZE OR EXACT PANELS (combined) */}
            {roofWizardStep === 3 && (
            <>
                <StepHeader
                title="How Many Panels Fit On This Roof?"
                subtitle="Choose a quick size or type an exact number. Remember solar panels are bigger than they appear (around 2m²) 
                so its better to be conservative with your estimate if you aren't sure."
                />

                <RoofWizardHeroImage stepIndex={roofWizardStep} draftRoof={draftRoof} />


                <div className="illustration">
                <div className="small-print" style={{ marginBottom: 10 }}>
                </div>

                <div className="choice-row">
                    {[
                    { label: "Small", value: "small" },
                    { label: "Medium", value: "medium" },
                    { label: "Large", value: "large" },
                    ].map((opt) => (
                    <div
                        key={opt.value}
                        className={`choice-pill ${
                        draftRoof.roofSize === opt.value ? "active" : ""
                        }`}
                        onClick={() => {
                        const suggestedPanels = ROOF_PANEL_PRESETS[opt.value] ?? 0;
                        setDraftRoof((prev) => ({
                            ...prev,
                            roofSize: opt.value,
                            panels: suggestedPanels,
                        }));
                        }}
                    >
                        <div className="choice-title">{opt.label}</div>
                        <div className="choice-sub">{ROOF_PANEL_PRESETS[opt.value]} panels</div>
                    </div>
                    ))}
                </div>
                </div>

                <label style={{ marginTop: 12 }}>
                Or enter exact panels
                <input
                    type="number"
                    min={0}
                    max={60}
                    value={draftRoof.panels === "" ? "" : draftRoof.panels ?? ""}
                    onChange={(e) => {
                    const raw = e.target.value;

                    setDraftRoof((prev) => ({
                        ...prev,
                        panels: raw === "" ? "" : Number(raw),
                        roofSize: "custom",
                    }));
                    }}
                    placeholder="e.g. 10"
                />
                </label>

                <ConfidenceNote title="You can change this later">
                This is just to estimate system size and savings. If you’re unsure, pick a size preset.
                </ConfidenceNote>
            </>
            )}


            {/* ACTION BUTTONS */}
            <div className="modal-actions">
            <button
                type="button"
                onClick={() => {
                if (roofWizardStep === 0) {
                    onClose();
                    return;
                }
                setError("");
                setRoofWizardStep((s) => Math.max(0, s - 1));
                }}
            >
                {roofWizardStep === 0 ? "Cancel" : "← Back"}
            </button>

            <button
                type="button"
                onClick={() => {
                // Per-step validation (stops them moving forward too early)
                if (roofWizardStep === 0 && !draftRoof.orientation) {
                    setError("Please choose an orientation to continue.");
                    return;
                }
                if (roofWizardStep === 1 && !draftRoof.tilt) {
                    setError("Please choose a tilt to continue.");
                    return;
                }
                if (roofWizardStep === 2 && !draftRoof.shading) {
                    setError("Please choose a shading option to continue.");
                    return;
                }

                    // Combined last step: must have panels > 0
                if (roofWizardStep === 3) {
                    const panels = Number(draftRoof.panels || 0);
                    if (panels <= 0) {
                    setError("Please enter at least 1 panel (or choose a size) to finish.");
                    return;
                    }
                    setError("");
                    onSave();
                    return;
                }

                setError("");
                setRoofWizardStep((s) => Math.min(3, s + 1));
                }}
            >
                {roofWizardStep === 3 ? "Finish" : "Next →"}
            </button>
            </div>

            {/* Show errors inside modal too */}
            {error && <div className="error">{error}</div>}
        </div>
    </div>
  );
}