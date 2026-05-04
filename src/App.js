import React, { useEffect, useState, useRef} from "react";
import "./App.css";
import SectionHeader from "./ui/SectionHeader.js";
import Card from "./ui/Card.js";
import CardAlt from "./ui/CardAlt.js";
import CardAlt2 from "./ui/CardAlt2.js";
import ButtonLink from "./ui/ButtonLink.js";
import { Stat, StatGrid } from "./ui/Stat.js";
import QuoteHeader from "./ui/QuoteHeader";
import ConfigChoiceCard from "./ui/ProductTile.js"
import { getMcsTableData } from "./utils/mcsTableData";
import McsPerformanceTable from "./components/McsPerformanceTable";
import McsPerformanceModal from "./components/McsPerformanceModal";
import {
  API_BASE,
  generateQuote,
  recalculateQuote,
  getPdfQuoteData,
  downloadQuotePdf,
  emailQuoteLead,
  requestCallLead,
} from "./api/quoteApi";

import {
  DEFAULT_TARIFF,
  cleanTariffObject,
} from "./utils/tariffUtils";

import {
  calculateIRR,
  buildMonthlySavingsRows,
  toNumber,
} from "./utils/quoteFormatting";

import {
  formatPostcodeInput,
  isValidUkPostcode,
} from "./utils/postcodeUtils";

import LoadingScreen from "./components/LoadingScreen";

// ===========================
// Platform + Installer Config
// ===========================
const PLATFORM = {
  toolName: "Zeyzer Solar",
  headline: "Instant Solar Estimate For Your Home",
  subheadline:
    "Get a personalised price, savings and payback estimate in under 60 seconds.",
  contactEmail: "hello@zeyzersolar.com",
  trustBadges: [
    "✅ No-obligation estimate",
    "⚡ Takes under 60 seconds",
    "🔒 Your data is kept private",
  ],
};

const INSTALLER = null;
const CONTACT_EMAIL = (INSTALLER && INSTALLER.contactEmail) || PLATFORM.contactEmail;

/**
 * =========================================================
 * Local storage persistence helpers
 * =========================================================
 */
const STORAGE_KEY = "zeyzer_quote_state";

const TOTAL_STEPS = 5;

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}



/**
 * =========================================================
 * Default form state
 * =========================================================
 */
const DEFAULT_FORM = {
  name: "",
  email: "",
  address: "",
  phone: "",

  homeOwnership: "",
  houseNumber: "",
  postcode: "",

  annualKWh: "",
  monthlyBill: "",
  roofSize: "medium",
  shading: "none",
  occupancyProfile: "half_day",

  panelOption: "value",
  batteryKWh: 0,
  birdProtection: false,
  evCharger: false,

  // ✅ NEW: baseline (before solar) vs solar (after solar) tariffs
  tariffBefore: {
    ...DEFAULT_TARIFF,
    // baseline doesn't need export, but leaving it doesn't hurt
  },

  tariffAfter: {
    ...DEFAULT_TARIFF,
  },
};


const DEFAULT_ROOFS = () => ([]);

const ROOF_PANEL_PRESETS = {
  small: 6,
  medium: 10,
  large: 14,
};


// ---------- Confidence UI components (reusable) ----------

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function ConfidenceNote({ title = "Quick tip", children }) {
  return (
    <div className="confidence-note">
      <div className="confidence-note-title">✅ {title}</div>
      <div className="confidence-note-body">{children}</div>
    </div>
  );
}

function StepHeader({ title, subtitle, badge }) {
  return (
    <div className="step-header">
      <div>
        <h4 className="step-title">{title}</h4>
        {subtitle && <p className="step-subtitle">{subtitle}</p>}
      </div>
      {badge && <div className="step-badge">{badge}</div>}
    </div>
  );
}


// -------- Roof Wizard image mapping (you will add real images later) --------

// A nice "default" image to show when nothing is selected yet
const ROOF_WIZARD_DEFAULT_IMAGE = "/roof-wizard/default.png";

// Map step + selection -> image path in /public
const ROOF_WIZARD_IMAGES = {
  orientation: {
    "": ROOF_WIZARD_DEFAULT_IMAGE,
    N: "/roof-wizard/orientation/N.png",
    NE: "/roof-wizard/orientation/NE.png",
    E: "/roof-wizard/orientation/E.png",
    SE: "/roof-wizard/orientation/SE.png",
    S: "/roof-wizard/orientation/S.png",
    SW: "/roof-wizard/orientation/SW.png",
    W: "/roof-wizard/orientation/W.png",
    NW: "/roof-wizard/orientation/NW.png",
  },

  tilt: {
    "": ROOF_WIZARD_DEFAULT_IMAGE,
    25: "/roof-wizard/tilt/25.png",
    40: "/roof-wizard/tilt/40.png",
    55: "/roof-wizard/tilt/55.png",
  },

  shading: {
    "": ROOF_WIZARD_DEFAULT_IMAGE,
    none: "/roof-wizard/shading/none.png",
    some: "/roof-wizard/shading/some.png",
    a_lot: "/roof-wizard/shading/a_lot.png",
  },

  panels: {
    // optional: size presets
    small: "/roof-wizard/panels/small.png",
    medium: "/roof-wizard/panels/medium.png",
    large: "/roof-wizard/panels/large.png",
    custom: "/roof-wizard/panels/custom.png",
    "": ROOF_WIZARD_DEFAULT_IMAGE,
  },
};

// Small thumbnails for the roof summary cards
function getRoofThumbsForRoof(roof) {
  return {
    orientation:
      ROOF_WIZARD_IMAGES.orientation[roof.orientation || ""] ||
      ROOF_WIZARD_DEFAULT_IMAGE,

    tilt:
      ROOF_WIZARD_IMAGES.tilt[String(roof.tilt || "")] ||
      ROOF_WIZARD_DEFAULT_IMAGE,

    shading:
      ROOF_WIZARD_IMAGES.shading[roof.shading || ""] ||
      ROOF_WIZARD_DEFAULT_IMAGE,

    panels: (() => {
      // If roofSize is custom/empty, show custom (or default)
      const key = roof.roofSize || (Number(roof.panels) > 0 ? "custom" : "");
      return (
        ROOF_WIZARD_IMAGES.panels[key] ||
        ROOF_WIZARD_DEFAULT_IMAGE
      );
    })(),
  };
}

function Thumb({ src, alt }) {
  return (
    <img
      className="roof-thumb"
      src={src}
      alt={alt}
      onError={(e) => {
        e.currentTarget.src = ROOF_WIZARD_DEFAULT_IMAGE;
      }}
    />
  );
}

function RoofSummaryRow({ label, value, thumbSrc }) {
  return (
    <div className="roof-summary-row">
      <Thumb src={thumbSrc} alt={`${label} illustration`} />
      <div className="roof-summary-text">
        <div className="roof-summary-label">{label}</div>
        <div className="roof-summary-value">{value}</div>
      </div>
    </div>
  );
}


function RoofWizardHeroImage({ stepIndex, draftRoof }) {
  let src = ROOF_WIZARD_DEFAULT_IMAGE;

  // 0 orientation, 1 tilt, 2 shading, 3 panels/size
  if (stepIndex === 0) {
    const key = draftRoof.orientation || "";
    src = ROOF_WIZARD_IMAGES.orientation[key] || ROOF_WIZARD_DEFAULT_IMAGE;
  } else if (stepIndex === 1) {
    const key = String(draftRoof.tilt || "");
    src = ROOF_WIZARD_IMAGES.tilt[key] || ROOF_WIZARD_DEFAULT_IMAGE;
  } else if (stepIndex === 2) {
    const key = draftRoof.shading || "";
    src = ROOF_WIZARD_IMAGES.shading[key] || ROOF_WIZARD_DEFAULT_IMAGE;
  } else if (stepIndex === 3) {
    const key = draftRoof.roofSize || "";
    src = ROOF_WIZARD_IMAGES.panels[key] || ROOF_WIZARD_DEFAULT_IMAGE;
  }

  return (
    <div className="wizard-hero">
      <img
        className="wizard-hero-img"
        src={src}
        alt="Roof selection illustration"
        onError={(e) => {
          e.currentTarget.src = ROOF_WIZARD_DEFAULT_IMAGE;
        }}
      />
    </div>
  );
}


function TariffModal({
  open,

  tariffEditMode,
  switchTariffMode,

  draftTariff,
  setDraftTariff,

  onClose,
  onSave,
}) {

  if (!open) return null;

  const setField = (k, v) => setDraftTariff((t) => ({ ...t, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-600 to-teal-500" />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">Tariff settings</div>
              <div className="mt-1 text-sm text-slate-500">
                Choose your electricity tariff. This affects battery charging, exporting, and savings.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => switchTariffMode("before")}
              className={
                "rounded-xl px-3 py-2 text-sm font-semibold " +
                (tariffEditMode === "before"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
              }
            >
              Before solar
            </button>

            <button
              type="button"
              onClick={() => switchTariffMode("after")}
              className={
                "rounded-xl px-3 py-2 text-sm font-semibold " +
                (tariffEditMode === "after"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
              }
            >
              After solar
            </button>
          </div>


          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Tariff type</label>
              <select
                value={draftTariff.tariffType}
                onChange={(e) => setField("tariffType", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="standard">Standard variable</option>
                <option value="overnight">Cheap overnight (EV style)</option>
                <option value="flux">Flux style (time-of-use)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Standing charge (£/day)</label>
              <input
                type="number"
                step="0.01"
                value={draftTariff.standingChargePerDay}
                onChange={(e) => setField("standingChargePerDay", Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            {tariffEditMode === "after" && (
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Export (SEG) rate (£/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={draftTariff.segPrice}
                  onChange={(e) => setField("segPrice", Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}

            {draftTariff.tariffType === "standard" && (
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Import rate (£/kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={draftTariff.importPrice}
                  onChange={(e) => setField("importPrice", Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}

            {draftTariff.tariffType === "overnight" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Night import (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.importNight}
                    onChange={(e) => setField("importNight", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Day import (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.importDay}
                    onChange={(e) => setField("importDay", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            {draftTariff.tariffType === "flux" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Off-peak import (12 - 6 am) (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.importOffPeak}
                    onChange={(e) => setField("importOffPeak", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Off-peak (12 - 6 am) export (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.exportOffPeak}
                    onChange={(e) => setField("exportOffPeak", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Peak (4 - 7 pm) import (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.importPeak}
                    onChange={(e) => setField("importPeak", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Peak (4 - 7 pm) export (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.exportPeak}
                    onChange={(e) => setField("exportPeak", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Day import (all other hours) (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.importPrice}
                    onChange={(e) => setField("importPrice", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Day export (all other hours) (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.segPrice}
                    onChange={(e) => setField("segPrice", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    checked={!!draftTariff.exportFromBatteryEnabled}
                    onChange={(e) => setField("exportFromBatteryEnabled", e.target.checked)}
                  />
                  <span className="text-sm text-slate-700">
                    Allow exporting from battery when export price is high
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save tariff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


//================
// Energy Flows
//================
function EnergyFlowCards({ hasBattery, mode }) {
  const videos = {
    excess: hasBattery
      ? "/videos/flows/excess-battery.mov"
      : "/videos/flows/excess-nobattery.mov",
    partial: hasBattery
      ? "/videos/flows/partial-battery.mov"
      : "/videos/flows/partial-nobattery.mov",
    night: hasBattery
      ? "/videos/flows/night-battery.mov"
      : "/videos/flows/night-nobattery.mov",
  };

  return (
    <CardAlt
      mode={mode}
      title="How Your System Works">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FlowVideoCard
          title="Excess solar"
          subtitle={
            hasBattery
              ? "Home is powered first, then the battery charges. Any remaining solar is exported."
              : "Home is powered first. Any remaining solar is exported to the grid."
          }
          src={videos.excess}
        />

        <FlowVideoCard
          title="Partial offset"
          subtitle="Solar covers some of your homes demand. The grid or your battery supplies the remainder."
          src={videos.partial}
        />

        <FlowVideoCard
          title="At night"
          subtitle={
            hasBattery
              ? "The battery supplies the home first. The grid supports if needed."
              : "The grid supplies the home."
          }
          src={videos.night}
        />
      </div>

      <p className="mt-4 text-xs text-slate-500 text-center">
        These animations are illustrative. Your detailed performance numbers are shown in the charts above.
      </p>
    </CardAlt>
  );
}


function FlowVideoCard({ title, subtitle, src }) {
  return (
    <div className="rounded-2xl  bg-white p-4">
      <div className="text-center text-body font-semibold text-accent">
        {title}
      </div>
      <div className="mt-1 text-center text-small leading-5 text-brand">
        {subtitle}
      </div>

      <div className="mt-4 flex items-center justify-center rounded-xl border-1 border-sky-200 bg-slate-50 p-3">
        <video
          className="block aspect-square w-full max-w-[260px] object-contain"
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      </div>
    </div>
  );
}


// =======================
// System configuration display helpers
// =======================

function humanPanelOption(opt) {
  const s = String(opt || "").toLowerCase();
  if (s.includes("premium")) return "Premium";
  if (s.includes("standard")) return "Standard";
  if (s.includes("budget")) return "Budget";
  // fallback: show original
  return opt || "your chosen";
}

const PANEL_UI = (panelOption) => {
  const s = String(panelOption || "").toLowerCase();

  if (s.includes("premium")) {
    return {
      image: "/products/panels-premium-portrait.png",
      aboutTitle: "Premium panels",
      aboutText:
        "Premium panels prioritise high efficiency, good aesthetics and strong warranties. They’re ideal when roof space is limited or you want maximum output per panel. They are also an ideal choice to maximise your lifetime savings.",
    };
  }

  if (s.includes("value")) {
    return {
      image: "/products/panels-standard-portrait.png",
      aboutTitle: "Standard panels",
      aboutText:
        "Standard panels offer excellent value and reliable performance. These panels are a great option when you want a short payback period. They will typically have 2 of high efficiency, an all-black appearance and 25-year warranty.",
    };
  }

  return {
    image: "/products/panels-portrait.png",
    aboutTitle: "Solar panels",
    aboutText:
      "We’ve selected panels appropriate for your roof and usage. Exact model and layout can be confirmed after a survey.",
  };
};

const BATTERY_UI = (capacity) => {
  const c = Number(capacity || 0);

  if (!c || c <= 0) {
    return {
      image: "/products/battery-no-portrait.png",
      aboutTitle: "No battery selected",
      aboutText:
        "Without a battery, all excess solar is exported to the grid. Your evening and night-time electricity comes from the grid. We would advise installing a battery as they have a lot of benefits but you don't need one to benefit from solar.",
    };
  }

  if (c <= 5) {
    return {
      image: "/products/Small-home-battery.png",
      aboutTitle: "Small home battery",
      aboutText:
        "A compact battery helps shift daytime solar into the evening. Great for modest evening usage and improving self-consumption. Installing a bigger battery might give you more options to maximise your savings!",
    };
  }

  if (c <= 9) {
    return {
      image: "/products/battery-medium-portrait.jpg",
      aboutTitle: "Medium home battery",
      aboutText:
        "A balanced battery size that typically covers more evening demand and reduces grid reliance across more of the year. Your additional battery storage can be used to increase your savings in a variety of ways.",
    };
  }

  return {
    image: "/products/battery-large-portrait.png",
    aboutTitle: "Large home battery",
    aboutText:
      "Higher capacity maximises stored solar and can reduce imports further—especially for larger homes or higher evening demand. For most homes, a battery this size will be too large to be worth the high cost",
    };
};

const EV_UI = (enabled) => {
  if (enabled) {
    return {
      image: "/products/ev-yes-portrait.jpg",
      aboutTitle: "EV charger included",
      aboutText:
        "A home EV charger offers safe, convenient charging with smart scheduling—perfect for overnight tariffs or solar-aware charging. There are a lot of types of charger but most now have smart integrations.",
    };
  }
  return {
    image: "/products/ev-no-portrait.png",
    aboutTitle: "No EV charger",
    aboutText:
      "You haven’t included an EV charger. If you are considering a EV car in the next couple of years it might be worth considering installing now as any smart charger would be at 0% VAT. ",
    };
};

const BIRD_UI = (enabled) => {
  if (enabled) {
    return {
      image: "/products/bird-yes-portrait.jpg",
      aboutTitle: "Bird protection included",
      aboutText:
        "Bird mesh reduces the chance of nesting under panels and helps protect cabling and airflow. We have priced this based on the simple bird mesh protection. Other options like SolaSkirt might cost more.",
    };
  }
  return {
    image: "/products/bird-no-portrait.png",
    aboutTitle: "No bird protection",
    aboutText:
      "You haven’t included bird protection. Some homes never have any pigeon problems but its almost impossible to predict. Since bird mesh doesn't cost much it might be worth installing for peace of mind.",
    };
};

function FinanceDetailsModal({ open, onClose, rows }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <div className="text-base font-semibold text-slate-900">Financial calculation details</div>
            <div className="mt-1 text-sm text-slate-600">
              Year-by-year projection including 6% energy cost increase.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-4">
          <FinanceDetailsTable rows={rows} />

          <p className="mt-3 text-xs text-slate-500">
            Net position = cumulative bill savings minus system cost (mid price). Solar generation is held constant unless degradation is applied.
          </p>
        </div>
      </div>
    </div>
  );
}

function FinanceDetailsTable({ rows, pdfMode = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div
        className={
          pdfMode
            ? "grid grid-cols-6 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600"
            : "grid grid-cols-6 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
        }
      >
        <div>Year</div>
        <div className="text-right">Solar gen (kWh)</div>
        <div className="text-right">Bill before</div>
        <div className="text-right">Bill after</div>
        <div className="text-right">Bill saving</div>
        <div className="text-right">Net position</div>
      </div>

      <div className={pdfMode ? "divide-y divide-slate-200 text-[11px]" : "divide-y divide-slate-200 text-sm"}>
        {(rows || []).map((r) => (
          <div key={r.year} className={pdfMode ? "grid grid-cols-6 px-3 py-2" : "grid grid-cols-6 px-3 py-2"}>
            <div className="font-medium text-slate-900">{r.year}</div>
            <div className="text-right">{Number(r.solarGenerationKWh || 0).toLocaleString()}</div>
            <div className="text-right">£{Number(r.billBefore || 0).toLocaleString()}</div>
            <div className="text-right">£{Number(r.billAfter || 0).toLocaleString()}</div>
            <div className="text-right">£{Number(r.billSavings || 0).toLocaleString()}</div>
            <div className="text-right font-semibold text-slate-900">
              £{Number(r.netPosition || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlySavingsModal({ open, onClose, rows }) {
  if (!open) return null;

  const totals = (rows || []).reduce(
    (acc, r) => {
      acc.demandKWh += Number(r.demandKWh || 0);
      acc.oldBill += Number(r.oldBill || 0);
      acc.newImportCost += Number(r.newImportCost || 0);
      acc.segIncome += Number(r.segIncome || 0);
      acc.newBill += Number(r.newBill || 0);
      acc.monthlySavings += Number(r.monthlySavings || 0);
      return acc;
    },
    {
      demandKWh: 0,
      oldBill: 0,
      newImportCost: 0,
      segIncome: 0,
      newBill: 0,
      monthlySavings: 0,
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <div className="text-base font-semibold text-slate-900">
              Monthly savings breakdown
            </div>
            <div className="mt-1 text-sm text-slate-600">
              First-year monthly demand, pre-solar bill, post-solar import cost, SEG income and net savings.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-4">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-7 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <div>Month</div>
              <div className="text-right">Demand (kWh)</div>
              <div className="text-right">Old bill</div>
              <div className="text-right">New import cost</div>
              <div className="text-right">SEG income</div>
              <div className="text-right">New bill</div>
              <div className="text-right">Monthly savings</div>
            </div>

            <div className="divide-y divide-slate-200 text-sm">
              {(rows || []).map((r) => (
                <div key={r.month} className="grid grid-cols-7 px-3 py-2">
                  <div className="font-medium text-slate-900">{r.month}</div>
                  <div className="text-right">{Number(r.demandKWh || 0).toLocaleString()}</div>
                  <div className="text-right">£{Number(r.oldBill || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right">£{Number(r.newImportCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right">£{Number(r.segIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right">£{Number(r.newBill || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right font-semibold text-slate-900">
                    £{Number(r.monthlySavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-7 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900">
                <div>Total</div>
                <div className="text-right">{Math.round(totals.demandKWh).toLocaleString()}</div>
                <div className="text-right">£{totals.oldBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-right">£{totals.newImportCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-right">£{totals.segIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-right">£{totals.newBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-right">£{totals.monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            New bill = new import cost minus SEG income. Monthly savings = old bill minus new bill.
          </p>
        </div>
      </div>
    </div>
  );
}


function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function fmtHour(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return "00:00";
  const hh = ((Math.round(n) % 24) + 24) % 24; // safe wrap 0..23
  return String(hh).padStart(2, "0") + ":00";
}

function fmtWindow(startHour, endHour) {
  return `${fmtHour(startHour)} – ${fmtHour(endHour)}`;
}

//===================\\
// CREATE QUOTE PAGE \\
//===================\\

function QuotePage({
  quote,
  form,
  roofs,
  onEdit,
  onBackToForm,
  onDownloadPdf,
  onUpdateQuote,
  onOpenTariffModal,
  pdfMode = false,
  needsRecalc,
  setNeedsRecalc,
  updatedSections,
  setUpdatedSections,
}) {

  // MCS Table Chart
  const mcsTableData = getMcsTableData({ quote, form, roofs });
  const [mcsModalOpen, setMcsModalOpen] = useState(false);

  // Full Financials Pop-up
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [monthlySavingsModalOpen, setMonthlySavingsModalOpen] = useState(false);

  const monthlySavingsRows = buildMonthlySavingsRows(quote);

  // PDF Loading Pages
  const [pdfLoading, setPdfLoading] = useState(false);

  // Charge types (charge from grid and energy trading)
  const [batteryControls, setBatteryControls] = useState(() => ({
    allowGridCharging: quote?.tariffAfter?.allowGridCharging ?? true,
    allowEnergyTrading: quote?.tariffAfter?.allowEnergyTrading ?? false,
  }));

  // Battery recommendation lifetimes
  const [batteryRecommendationLifetimeYears, setBatteryRecommendationLifetimeYears] = useState(
    quote?.batteryRecommendations?.assumptions?.lifetimeYears || 25
  );

  useEffect(() => {
    const nextLifetime = quote?.batteryRecommendations?.assumptions?.lifetimeYears;
    if (typeof nextLifetime === "number" && Number.isFinite(nextLifetime)) {
      setBatteryRecommendationLifetimeYears(nextLifetime);
    }
  }, [quote?.batteryRecommendations?.assumptions?.lifetimeYears]);

  useEffect(() => {
    setBatteryControls({
      allowGridCharging: quote?.tariffAfter?.allowGridCharging ?? true,
      allowEnergyTrading: quote?.tariffAfter?.allowEnergyTrading ?? false,
    });
  }, [quote]);

  const [powerflowView, setPowerflowView] = useState("winter");

  function InfoTooltip({ text }) {
    const [open, setOpen] = React.useState(false);

    return (
      <span className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-transparent text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
          aria-label="More information"
        >
          i
        </button>

        {open && (
          <div className="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs leading-5 text-slate-600 shadow-lg">
            {text}
          </div>
        )}
      </span>
    );
  }

  function getRecalcButtonClass(needsRecalc) {
    return needsRecalc
      ? "rounded-xl bg-pop px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-2 ring-amber-300 animate-pulse hover:bg-amber-500"
      : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";
  }

  function StickyQuoteNav({ updatedSections = [], onExit }) {
    const items = [
      { id: "system-choices", label: "System Choices" },
      { id: "performance", label: "Performance" },
      { id: "financials", label: "Financials" },
      { id: "optimisations", label: "Optimisations" },
      { id: "next-steps", label: "Next Steps" },
    ];

    return (
    <div className="sticky-quote-nav sticky top-0 z-30 border-b border-white bg-slate-50 backdrop-blur">
      <div className="container-app py-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
          
          {/* Left: back button */}
          <div className="flex items-center justify-center xl:justify-start">
              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center gap-2 rounded-xl bg-pop px-3 py-2 text-sm font-medium text-brand hover:bg-white hover:text-ink ring-1 ring-transparent hover:ring-line"
              >
                ← Back to Zeyzer Solar
              </button>
            </div>

            {/* Middle: section nav */}
            <div className="flex flex-wrap justify-center items-center gap-3">
              {items.map((item) => {
                const isUpdated = updatedSections.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      document.getElementById(item.id)?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className={
                      isUpdated
                        ? "rounded-full bg-emerald-100 px-4 py-1 mb-2 mt-2 text-body font-medium text-ink ring-1 ring-emerald-300 animate-pulse hover:bg-pop/80"
                        : "rounded-full bg-teal-200 px-4 py-1 mb-2 mt-2 text-body font-medium text-ink ring-1 ring-emerald-300 hover:bg-pop/80"
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Right: logo / brand */}
            <div className="flex items-center justify-center xl:justify-end gap-2">
              <div className="h-8 w-8 rounded-xl bg-ink" />
              <div className="text-sm font-semibold text-ink">Zeyzer Solar</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mode = pdfMode ? "pdf" : "screen";
  const isMode = (value) => mode === value;
  const isPdf = isMode("pdf");
  const quoteContainerClass = isPdf ? "quote-container pdf-tight-top" : "quote-container";
  const quoteContentClass = isPdf
    ? "quote-content quote-content--clean pdf-tight-top"
    : "quote-content quote-content--clean";

  if (!quote) {
    return (
      <div className="quote-page">
        <div className="quote-page-card">
          <h2>No quote yet</h2>
          <p>Please complete the form to generate your estimate.</p>
          <button type="button" onClick={onBackToForm}>Back to form</button>
        </div>
      </div>
    );
  }

  const exitToWebsite = () => onBackToForm();

  // ---- IRR (use same source as payback chart) ----
  const payback = quote?.financialSeries?.payback;

  const systemCostMid =
    typeof payback?.systemCostMid === "number"
      ? payback.systemCostMid
      : null;

  let irrPct = null;

  if (
    systemCostMid != null &&
    Array.isArray(payback?.cumulativeSavings) &&
    payback.cumulativeSavings.length >= 2
  ) {
    // Build annual cashflows from cumulative series
    // Year 0: upfront investment (negative)
    const cashflows = [-systemCostMid];

    for (let i = 1; i < payback.cumulativeSavings.length; i++) {
      const prev = payback.cumulativeSavings[i - 1];
      const curr = payback.cumulativeSavings[i];
      cashflows.push(curr - prev);
    }

    const irr = calculateIRR(cashflows);
    irrPct = irr != null ? irr * 100 : null;
  }

  const baselineAnnualBill =
    toNumber(quote?.financialSeries?.monthly?.annualBaseline) ||
    (toNumber(form?.monthlyBill) * 12);

  const billSavingPctYear1 =
    baselineAnnualBill > 0
      ? (toNumber(quote.totalAnnualBenefit) / baselineAnnualBill) * 100
      : null;



  const totalPanels = roofs.reduce((sum, r) => sum + Number(r.panels || 0), 0);

  async function onEmailQuoteLead({ name, email, marketingConsent }) {
    const payload = {
      contact: {
        name,
        email,
        address: `${form.houseNumber || ""} ${form.postcode || ""}`.trim(),
      },
      quote,
      input: {
        ...form,
        roofs,
        extras: {
          evCharger: !!form.evCharger,
          birdProtection: !!form.birdProtection,
        },
      },
      marketingConsent,
    };

    await emailQuoteLead(payload);
  }


  async function onRequestCallLead({ name, email, phone, marketingConsent }) {
    const payload = {
      contact: {
        name,
        email,
        phone,
        address: `${form.houseNumber || ""} ${form.postcode || ""}`.trim(),
      },
      quote,
      input: {
        ...form,
        roofs,
        extras: {
          evCharger: !!form.evCharger,
          birdProtection: !!form.birdProtection,
        },
      },
      marketingConsent,
    };

    await requestCallLead(payload);
  }

  // TARIFF RECALCULATIONS
  async function recalcWithTariff() {
    try {
      // ✅ Use the latest tariff values from the form (TariffModal edits these)
      const tb = form?.tariffBefore || quote?.tariffBefore || {};

      const taBase =
        form?.tariffAfter ||
        quote?.tariffAfter ||
        quote?.tariff ||
        {};

      const ta = {
        ...taBase,

        // ✅ Always include battery toggles
        allowGridCharging: !!batteryControls.allowGridCharging,
        allowEnergyTrading: !!batteryControls.allowEnergyTrading,
      };

      const recalcInput = {
        ...form,
        roofs,
        extras: {
          evCharger: !!form?.evCharger,
          birdProtection: !!form?.birdProtection,
        },
      };

      const updated = await recalculateQuote({
        quote,
        tariffBefore: tb,
        tariffAfter: ta,
        input: recalcInput,
        batteryRecommendationLifetimeYears,
      });

      onUpdateQuote(updated);
      setNeedsRecalc(false);
      setUpdatedSections(["financials", "optimisations", "performance"]);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to recalculate.");
    }
  }

  // PDF Loading Page
  async function handlePdfDownload() {
    try {
      setPdfLoading(true);
      await onDownloadPdf();
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Sorry, there was a problem generating your PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  // ===============================
  // ENERGY FLOW TOTALS (GLOBAL)
  // ===============================

  const hm = quote?.hourlyModel || {};

  // -----------------------------
  // MONTHLY ARRAYS
  // -----------------------------
  const gen = (hm.monthlyGenerationKWh || []).map((v) => Number(v || 0));
  const direct = (hm.monthlyDirectToHomeKWh || []).map((v) => Number(v || 0));
  const pvExportDirect = (hm.monthlyPVExportedDirectKWh || []).map((v) => Number(v || 0));
  const battChargeFromPV = (hm.monthlyBatteryChargeFromPVKWh || []).map((v) => Number(v || 0));
  const battDischargeToHomeAll = (hm.monthlyBatteryDischargeKWh || []).map((v) => Number(v || 0));
  const battDischargeFromPVToLoad = (hm.monthlyBatteryDischargeFromPVToLoadKWh || []).map((v) => Number(v || 0));
  const exportedAll = (hm.monthlyExportedKWh || []).map((v) => Number(v || 0));
  const imported = (hm.monthlyImportedKWh || []).map((v) => Number(v || 0));

  // -----------------------------
  // TOTALS
  // -----------------------------
  const totalGen = gen.reduce((a, b) => a + Number(b || 0), 0);

  // Direct PV export only
  const totalSolarExport = pvExportDirect.reduce((a, b) => a + Number(b || 0), 0);

  // Self-consumed generation = all generation not exported
  const totalSolarUsed = Math.max(0, totalGen - totalSolarExport);

  // Donut / home-supply totals
  const totalDirect = direct.reduce((a, b) => a + Number(b || 0), 0);
  const totalBatteryToHome = battDischargeToHomeAll.reduce((a, b) => a + Number(b || 0), 0);

  // Solar delivered to home = direct PV + PV-origin battery discharge
  const totalSolarDeliveredToHome =
    totalDirect +
    battDischargeFromPVToLoad.reduce((a, b) => a + Number(b || 0), 0);

  // Financial export cross-check
  const totalExportAll = exportedAll.reduce((a, b) => a + Number(b || 0), 0);
  const totalImport = imported.reduce((a, b) => a + Number(b || 0), 0);

  const totalHomeDemand = Number(
    quote?.assumedAnnualConsumptionKWh ||
    form?.annualKWh ||
    0
  );

  const totalGridDirect = Math.max(
    0,
    totalHomeDemand - totalDirect - totalBatteryToHome
  );

  // -----------------------------
  // PERCENTAGES
  // -----------------------------

  // Share of generation retained (not exported)
  const selfConsumptionPct = totalGen > 0
    ? (totalSolarUsed / totalGen) * 100
    : 0;

  // Share of annual demand covered by solar
  const selfSufficiencyPct = totalHomeDemand > 0
    ? (totalSolarDeliveredToHome / totalHomeDemand) * 100
    : 0;

  // Donut percentages
  const solarDirectPct = totalHomeDemand > 0
    ? (totalDirect / totalHomeDemand) * 100
    : 0;

  const batteryPct = totalHomeDemand > 0
    ? (totalBatteryToHome / totalHomeDemand) * 100
    : 0;

  const gridPct = totalHomeDemand > 0
    ? (totalGridDirect / totalHomeDemand) * 100
    : 0;


  const tb = quote?.tariffBefore || null;
  const ta = quote?.tariffAfter || null;

  const showAfter =
    ta &&
    tb &&
    (JSON.stringify(tb) !== JSON.stringify(ta));


  return (
    <div className="quote-shell quote-shell--clean">
        {!isPdf && <StickyQuoteNav updatedSections={updatedSections} onExit={exitToWebsite}/>}
        {!isPdf && (
          <QuoteHeader
            onExit={exitToWebsite}
            quote={quote}
            mode={mode}
            showNav={!pdfMode}
            onJumpTo={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        )}
        
        <div className={quoteContainerClass}>
          <div className={quoteContentClass}>

          {isPdf && (
            <section className="pdf-cover-section pdf-cover-page">
              <div className="pdf-cover-inner">
                <div className="pdf-cover-logo-wrap">
                  <img
                    src="/logo.png"
                    alt="Zeyzer Solar"
                    className="pdf-cover-logo"
                  />
                </div>

                <h1 className="text-PDF text-accent text-center ">Your Solar Quote,<p>Bespoke To Your Home</p></h1>
                <p className="mt-2 text-h3 text-center text-brand">
                  Bespoke solar PV & battery system design, performance and savings for your home.
                </p>

                <div className="text-center mt-2 pdf-cover-customer">
                  {form?.name ? (
                    <div className="pdf-cover-customer-name">{form.name}</div>
                  ) : null}

                  <div className="pdf-cover-customer-address">
                    {[form?.address1, form?.address2, form?.town, form?.postcode]
                      .filter(Boolean)
                      .join(", ") || form?.postcode || "Address not provided"}
                  </div>
                </div>
              </div>
             
              {/* Hero image */}
              <div className="mt-6 mb-10">
                <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border-2 border-gentle">
                  <div className="relative">
                    <img
                      src="/images/solar-home2.jpeg"
                      alt="Solar panels on a residential home"
                      className="h-[200px] w-full object-cover sm:h-[240px] lg:h-[350px]"
                    />
                    {/* subtle fade for polish */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =======================
                SUMMARY (SaaS UI)
            ======================= */}
          <section id="summary" className={isPdf ? "pdf-summary-section" : "mt-[6rem]"}>
            <SectionHeader
              title="System Summary"
              description="Here is a summary of your new system and how it would perform."
              mode={mode}
              action={
                <div className="flex items-center gap-3">
                  <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                    Estimate
                  </span>
                  {!pdfMode && (
                  <ButtonLink onClick={() => onEdit(4)}>Edit</ButtonLink>
                  )}
                </div>
              }
            />
            {/* Badge row (subtle polish) */}
            <div className={pdfMode ? "mt-3 mb-5 flex items-center gap-2" : "mt-4 mb-8 flex items-center gap-2"}>
              <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                Store Your Quote
              </span>
              <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                Get you system installed
              </span>
            </div>

            {/* Key Results Panel */}
            <div
              className={
                isPdf
                  ? "mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 pdf-keep-together"
                  : "mt-6"
              }
            >

              {isPdf && (
                <div className="text-body font-semibold uppercase tracking-wide text-accent mb-3">
                  Key Results
                </div>
              )}
              
              <StatGrid mode={mode}>
                <Stat
                  label="Estimated price"
                  mode={mode}
                  value={
                    isPdf
                      ? `£${(quote.priceLow / 1000).toFixed(1)}k – £${(quote.priceHigh / 1000).toFixed(1)}k`
                      : `£${quote.priceLow.toLocaleString()} – £${quote.priceHigh.toLocaleString()}`
                  }
                />
                <Stat 
                  label="System size"
                  mode={mode}
                  value={`${quote.systemSizeKwp} kWp`} />
                <Stat
                  label="Est. annual benefit"
                  mode={mode}
                  value={`£${(quote.totalAnnualBenefit || 0).toLocaleString()}`}
                />
                <Stat
                  label="Projected payback"
                  mode={mode}
                  value={
                    quote?.financialSeries?.payback?.paybackYear != null
                      ? `${quote.financialSeries.payback.paybackYear} yrs`
                      : "N/A"
                  }
                />
              </StatGrid>

              {/* Reassurance line */}
              <p className="mt-3 text-xs text-slate-500">
                Based on PVGIS data and the information you’ve provided. Final figures may vary after a site survey.
              </p>
            </div>

            
            {/* =======================
                  System components + home supply
              ======================= */}
            {isPdf && (
              <div className={pdfMode ? "mt-6 grid grid-cols-2 gap-4 shadow-none" : "mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6"}>

                {/* LEFT: System components */}
                <CardAlt2
                  mode={mode}
                  title="System components">

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-small text-slate-500">Solar panels</div>
                      <div className="text-l font-medium text-slate-900">
                        {Array.isArray(roofs)
                          ? roofs.reduce((s, r) => s + Number(r?.panels || 0), 0)
                          : 0}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-small text-slate-500">Battery</div>
                      <div className="text-l font-medium text-slate-900">
                        {form?.batteryKWh ? `${form.batteryKWh} kWh` : "Not included"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-small text-slate-500">EV charger</div>
                      <div className="text-l font-medium text-slate-900">
                        {form?.evCharger ? "Included" : "Not included"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-small text-slate-500">Bird protection</div>
                      <div className="text-l font-medium text-slate-900">
                        {form?.birdProtection ? "Included" : "Not included"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 col-span-2">
                      <div className="text-small text-slate-500">Estimated annual generation</div>
                      <div className="text-l font-medium text-slate-900">
                        {quote?.hourlyModel?.monthlyGenerationKWh
                          ? `${Math.round(
                              quote.hourlyModel.monthlyGenerationKWh.reduce((a, b) => a + b, 0)
                            ).toLocaleString()} kWh`
                          : "—"}
                      </div>
                    </div>

                  </div>
                </CardAlt2>


                {/* RIGHT: reuse existing donut card */}
                <div className="h-full shadow-none">
                  <CardAlt2
                    mode={mode}
                    title="How Your Home Is Powered"
                    className="h-full flex flex-col"
                    bodyClassName="flex h-full flex-col items-center justify-center"
                  >
                    <p className="mt-1 text-sm text-center text-slate-600">
                      Estimated share of your home's electricity supplied by solar,
                      battery storage and grid electricity.
                    </p>

                    <div className="mt-4 flex shadow-none items-center justify-center w-full">
                      <SolarUsageDonut
                        direct={totalDirect}
                        battery={totalBatteryToHome}
                        grid={totalGridDirect}
                        pdfMode={pdfMode}
                      />
                    </div>
                  </CardAlt2>
                </div>
              </div>
            )}

            {/* Hero image */}
            {!pdfMode && (
            <div className="mt-10 mb-10">
              <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border-2 border-gentle">
                <div className="relative">
                  <img
                    src="/images/solar-home2.jpeg"
                    alt="Solar panels on a residential home"
                    className="h-[200px] w-full object-cover sm:h-[240px] lg:h-[350px]"
                  />
                  {/* subtle fade for polish */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                </div>
              </div>
            </div>
            )}

            {/* =======================
                Environmental impact
            ======================= */}
            {(() => {

              const annualGen =
                quote?.hourlyModel?.monthlyGenerationKWh?.reduce((a, b) => a + b, 0) || 0;

              const lifetimeYears = 25;
              const gridCO2 = 0.23; // kg per kWh UK average

              const lifetimeCO2 = Math.round(annualGen * lifetimeYears * gridCO2);

              const kmEquivalent = Math.round(lifetimeCO2 / 0.192);
              const flightsEquivalent = Math.round(lifetimeCO2 / 1500);
              const treesEquivalent = Math.round(lifetimeCO2 / 21);

              return (
                <div className="mt-2 rounded-2xl bg-white p-5 pdf-keep-together">

                  <div className={pdfMode ? "text-h3 text-center font-semibold text-slate-900" : "text-h2 text-center font-semibold text-slate-900"}>
                    Environmental Impact
                  </div>

                  <p className={isPdf ? "mt-1 text-center text-xs leading-snug text-slate-600" : "mt-1 text-center text-body text-slate-600"}>
                    Over its lifetime this solar system will significantly reduce
                    your household’s carbon footprint.
                  </p>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">

                    <div className="text-center">
                      <div className="text-2xl">🌍</div>
                      <div className={pdfMode ? "mt-1 text-xl font-medium text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {lifetimeCO2.toLocaleString()} kg
                      </div>
                      <div className="mt-1 text-xs text-slate-500">CO₂ avoided</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl">🚗</div>
                      <div className={pdfMode ? "mt-1 text-xl font-medium text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {kmEquivalent.toLocaleString()}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Car km avoided</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl">✈️</div>
                      <div className={pdfMode ? "mt-1 text-xl font-medium text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {flightsEquivalent}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">long-haul <p>flights avoided</p></div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl">🌳</div>
                      <div className={pdfMode ? "mt-1 text-xl font-medium text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {treesEquivalent}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Equivalent trees <p>planted</p></div>
                    </div>

                  </div>

                </div>
              );
            })()}
            
            {isPdf && (
              <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                <strong>Next step:</strong> If you’re happy with this design, we can arrange a
                site survey to confirm roof measurements, electrical connections and final
                installation details to produce your final quotation.
              </div>
            )}
                        
          </section>


          {/* =======================
                SYSTEM CHOICES (SaaS UI — grouped cards)
            ======================= */}
          <section id="system-choices"   className={pdfMode ? "mt-1" : "mt-[2rem]"}>
            <SectionHeader
              title="System Choices"
              description="Review your home assumptions and system configuration. Edit any section to compare options."
              mode={mode}
              action={
                <div className="flex items-center gap-3">
                  {!pdfMode && (
                  <ButtonLink onClick={() => onEdit(2)}>Edit</ButtonLink>
                  )}
                </div>
              }
            />
            {/* Badge row (subtle polish) */}
            <div className={pdfMode ? "mt-2 mb-3 flex items-center gap-2" : "mt-4 mb-8 flex items-center gap-2"}>
              <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                Your Home & Energy Use
              </span>
              <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                System Choices
              </span>
            </div>

            {/* =======================
                  A) Home & roof assumptions
            ======================= */}
            <div
              className={
                pdfMode
                  ? "mt-3 rounded-2xl bg-white pdf-two-card-group"
                  : "mt-6 rounded-2xl bg-white"
              }
            >
              <div
                className={
                  pdfMode
                    ? "mt-2 grid grid-cols-1 gap-4 items-start"
                    : "mt-1 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 items-stretch"
                }
              >
                {/* Energy usage group */}
                <div className="mt-2 h-full">
                  <Card
                    mode={mode}
                    title="Home Energy Usage"
                    right={!pdfMode && (<ButtonLink onClick={() => onEdit(2)}>Edit</ButtonLink>)}
                    className="h-full"
                  >
                  {/* Home summary rows (choice-card sentence style) */}
                  <div className={pdfMode ? "mt-1 space-y-1 text-sm text-slate-700" : "mt-3 space-y-2 text-body text-slate-700"}>
                    <div>
                      You’re using{" "}
                      <span className="font-semibold text-slate-900">
                        {Number(quote?.assumedAnnualConsumptionKWh || 0).toLocaleString()} kWh/year
                      </span>{" "}
                      based on your inputs.
                    </div>

                    <div>
                      Occupancy profile:{" "}
                      <span className="font-semibold text-slate-900">
                        {String(form?.occupancyProfile || "Not set").replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className={pdfMode ? "mt-4" : "mt-4"}>
                    <div className={pdfMode ? "mt-3" : "mt-3"}>
                      <DailyUsageLineChart 
                      profile={quote?.dailyUsageProfile}
                      pdfMode={pdfMode}
                       />
                    </div>
                  </div>

                  <p className={pdfMode ? "mt-2 text-[11px] leading-snug text-slate-500" : "mt-3 text-small text-slate-500"}>
                    This curve is based on your occupancy profile and annual consumption.
                  </p>
                  </Card>
                </div>

                {/* Roof info group */}
                <div className={pdfMode ? "mt-1 pdf-keep-together h-full" : "mt-2 h-full"}>
                  <Card
                    mode={mode}
                    title="Roof Information"
                    right={<ButtonLink onClick={() => onEdit(3)}>Edit</ButtonLink>}
                    className="h-full"
                  >
                    {/* Roof summary rows (choice-card sentence style) */}
                    <div className={pdfMode ? "mt-1 space-y-1 text-sm text-slate-700" : "mt-3 space-y-2 text-body text-slate-700"}>
                      <div>
                        Roof sections included:{" "}
                        <span className="font-semibold text-slate-900">
                          {Array.isArray(roofs) ? roofs.length : 0}
                        </span>
                      </div>

                      <div>
                        Total panels across all roofs:{" "}
                        <span className="font-semibold text-slate-900">
                          {Number(totalPanels || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className={pdfMode ? "mt-2" : "mt-4"}>
                      {roofs?.length ? (
                        <div
                          className={
                            pdfMode
                              ? "overflow-hidden rounded-xl border border-slate-200"
                              : "overflow-hidden rounded-xl border border-slate-200 shadow-bubble"
                          }
                        >
                          <table className="w-full table-fixed border-collapse">
                            <thead>
                              <tr
                                className={
                                  pdfMode
                                    ? "bg-white text-[11px] font-semibold text-slate-700"
                                    : "bg-white text-sm font-semibold text-slate-700"
                                }
                              >
                                <th className={pdfMode ? "px-2 py-1 text-center w-[16%]" : "px-3 py-2 text-center w-[16%]"}>Roof</th>
                                <th className={pdfMode ? "px-2 py-1 text-center w-[18%]" : "px-3 py-2 text-center w-[18%]"}>Orientation</th>
                                <th className={pdfMode ? "px-2 py-1 text-center w-[12%]" : "px-3 py-2 text-center w-[12%]"}>Tilt</th>
                                <th className={pdfMode ? "px-2 py-1 text-center w-[18%]" : "px-3 py-2 text-center w-[18%]"}>Shading</th>
                                <th className={pdfMode ? "px-2 py-1 text-center w-[16%]" : "px-3 py-2 text-center w-[16%]"}>Panels</th>
                                <th className={pdfMode ? "px-2 py-1 text-center w-[20%]" : "px-3 py-2 text-center w-[20%]"}>kWp</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200">
                              {roofs.map((r, idx) => {
                                const panelWatt = Number(quote?.panelWatt || 0);
                                const kwp =
                                  r.panels != null && panelWatt > 0
                                    ? (Number(r.panels) * panelWatt) / 1000
                                    : null;

                                return (
                                  <tr
                                    key={r.id || idx}
                                    className={
                                      pdfMode
                                        ? "bg-soft text-[11px] text-slate-700"
                                        : "bg-soft text-sm text-slate-700"
                                    }
                                  >
                                    <td className={pdfMode ? "px-2 py-1 text-center" : "px-3 py-2 text-center"}>Roof {idx + 1}</td>
                                    <td className={pdfMode ? "px-2 py-1 text-center" : "px-3 py-2 text-center"}>{r.orientation || "—"}</td>
                                    <td className={pdfMode ? "px-2 py-1 text-center" : "px-3 py-2 text-center"}>{r.tilt != null ? `${r.tilt}°` : "—"}</td>
                                    <td className={pdfMode ? "px-2 py-1 text-center" : "px-3 py-2 text-center"}>{r.shading || "—"}</td>
                                    <td className={pdfMode ? "px-2 py-1 text-center" : "px-3 py-2 text-center"}>
                                      {r.panels != null ? String(r.panels) : "—"}
                                    </td>
                                    <td className={pdfMode ? "px-2 py-1 text-center" : "px-3 py-2 text-center"}>
                                      {kwp != null ? `${kwp.toFixed(2)}` : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          No roof data found — add roofs to estimate system size and performance.
                        </p>
                      )}
                    </div>

                    <p className={pdfMode ? "mt-2 text-[11px] leading-snug text-slate-500" : "mt-3 text-xs text-slate-500"}>
                      Tip: Split panels across multiple roofs if orientations differ.
                    </p>

                    {/* Things to consider */}
                    <div className={pdfMode ? "mt-3 rounded-2xl bg-white p-2" : "mt-6 rounded-2xl p-4 bg-white"}>
                      <div className={pdfMode ? "text-sm font-semibold text-slate-900" : "text-body font-semibold text-slate-900"}>Things to consider</div>
                      <ul className={pdfMode ? "mt-2 list-disc space-y-1 pl-4 text-small leading-snug text-slate-700" : "mt-2 list-disc space-y-1 pl-5 text-body text-slate-700"}>
                        <li>Shading can reduce generation — There are a few ways we can mitigate shade and a site survey helps confirm this.</li>
                        <li>Panel layout may change slightly to avoid roof fixtures and keep clearances.</li>
                        <li>Different roof finishes can increase your installation time and cost. For example, slate is more fragile so can increase costs.</li>
                      </ul>
                    </div>
                  </Card>
                </div>
              </div>  
            </div>

            {/* =======================
                B) System Preferences
            ======================= */}
            <div className={pdfMode ? "mt-3" : "mt-7"}>
              <CardAlt
                mode={mode}
                title="System Preferences"
                right={!pdfMode && (<ButtonLink onClick={() => onEdit(4)}>Edit system</ButtonLink>)}
              >
                {(() => {
                  const totalPanels = (roofs || []).reduce((s, r) => s + Number(r?.panels || 0), 0);
                  const batteryCapacityKWh = Number(form?.batteryCapacity ?? form?.batteryKWh ?? 0);

                  const panelUI = PANEL_UI(form.panelOption);
                  const batteryUI = BATTERY_UI(batteryCapacityKWh);
                  const evUI = EV_UI(!!form.evCharger);
                  const birdUI = BIRD_UI(!!form.birdProtection);

                  return (
                    <div className={pdfMode ? "mt-3 pdf-keep-together pdf-system-pref-group" : "mt-6"}>
                      <div className={pdfMode ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6"}>
                        <ConfigChoiceCard
                          mode={mode}
                          title="Solar panels"
                          summary={`You have selected the ${humanPanelOption(form.panelOption)} solar panel option and added ${totalPanels} total panels across your roof${totalPanels === 1 ? "" : "s"}.`}
                          imageSrc={panelUI.image}
                          aboutTitle={panelUI.aboutTitle}
                          aboutText={panelUI.aboutText}
                        />

                        <ConfigChoiceCard
                          mode={mode}
                          title="Battery"
                          summary={
                            batteryCapacityKWh > 0
                              ? `You have included a ${batteryCapacityKWh} kWh home battery to store excess solar for later use. A battery opens the door to a lot more avenues for savings.`
                              : "You have not included a battery — excess solar is exported and night-time usage comes from the grid."
                          }
                          imageSrc={batteryUI.image}
                          aboutTitle={batteryUI.aboutTitle}
                          aboutText={batteryUI.aboutText}
                        />

                        <ConfigChoiceCard
                          mode={mode}
                          title="EV charger"
                          summary={
                            form.evCharger
                              ? "You have included an EV charger as part of your system."
                              : "You have not included an EV charger."
                          }
                          imageSrc={evUI.image}
                          aboutTitle={evUI.aboutTitle}
                          aboutText={evUI.aboutText}
                        />

                        <ConfigChoiceCard
                          mode={mode}
                          title="Bird protection"
                          summary={
                            form.birdProtection
                              ? "You have included bird protection to help prevent nesting under panels."
                              : "You have not included bird protection."
                          }
                          imageSrc={birdUI.image}
                          aboutTitle={birdUI.aboutTitle}
                          aboutText={birdUI.aboutText}
                        />
                      </div>
                    </div>
                  );
                })()}
              </CardAlt>
            </div>
          </section>


          {/* =======================
                SYSTEM PERFORMANCE (SaaS UI)
            ======================= */}
          <section id="performance" className={pdfMode ? "mt-1 pdf-page-break-before" : "mt-[2rem]"}>
            <SectionHeader
              title="System Performance"
              description="How your new solar PV system affects your home's energy usage."
              mode={mode}
              action={!pdfMode && (
                <ButtonLink onClick={() => onEdit(3)}>Edit</ButtonLink>)}
            />

            {!quote.hourlyModel || !Array.isArray(quote.hourlyModel.monthlyGenerationKWh) ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Hourly simulation not available</p>
                    <p className="mt-1 text-sm text-slate-600">
                      We’ll fall back to an annual estimate when PVGIS hourly data can’t be fetched.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Fallback mode
                  </span>
                </div>
              </div>
            ) : (() => {
                const hm = quote.hourlyModel;
                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const hasBattery = Number(form.batteryKWh || 0) > 0;

                return (
                <>

                {/* BADGES */}
                <div className={pdfMode ? "mt-2 mb-3 flex items-center gap-2" : "mt-4 mb-8 flex items-center gap-2"}>
                  <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                    PVGIS hourly simulation
                  </span>
                  {hasBattery &&
                    <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                      Battery modelled
                    </span>
                  }
                </div>


                {/* STATS + DONUT */}
                <div
                  className={
                    pdfMode
                      ? "mt-2 grid grid-cols-1 gap-3 pdf-keep-together"
                      : "mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3 lg:gap-6"
                  }
                >
                  {/* Left: stats (2/3 width) */}
                  <div className={pdfMode ? "h-full mt-2" : "lg:col-span-2 h-full"}>
                    <CardAlt2 
                      title="Energy Snapshot"
                      mode={mode} 
                      className="h-full"
                      right={
                        !pdfMode && (
                          <button
                            type="button"
                            onClick={() => setMcsModalOpen(true)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                          >
                            View MCS performance table
                          </button>
                        )
                      }>

                      {/* Energy summary bubbles */}
                      <div className={pdfMode ? "mt-2" : "mt-4"}>
                        <div className={pdfMode ? "grid grid-cols-3 gap-2" : "grid grid-cols-1 gap-4 sm:grid-cols-3"}>

                          {/* Annual generation */}
                          <div className={pdfMode ? "rounded-2xl border-2 border-amber-500 bg-amber-200 px-3 py-3 text-center" : "rounded-2xl border-2 border-amber-500 bg-amber-200 px-6 py-5 text-center"}>
                            <div className={pdfMode ? "text-lg font-normal leading-tight text-slate-900" : "text-2xl font-semibold text-slate-900"}>
                              {`${Math.round(totalGen).toLocaleString()} kWh`}
                            </div>
                            <div className={pdfMode ? "mt-1 text-xs leading-tight text-slate-900" : "mt-1 text-sm text-slate-900"}>Annual generation</div>
                          </div>

                          {/* Solar used */}
                          <div className={pdfMode ? "rounded-2xl border-2 border-accent bg-blue-300 px-3 py-3 text-center" : "rounded-2xl border-2 border-accent bg-blue-300 px-6 py-5 text-center"}>
                            <div className={pdfMode ? "text-lg font-normal leading-tight text-slate-900" : "text-2xl font-semibold text-slate-900"}>
                              {`${Math.round(totalSolarUsed).toLocaleString()} kWh`}
                            </div>
                            <div className={pdfMode ? "mt-1 text-xs leading-tight text-slate-900" : "mt-1 text-sm text-slate-900"}>Solar used in home</div>
                          </div>

                          {/* Exported */}
                          <div className={pdfMode ? "rounded-2xl border-2 border-slate-400 bg-slate-200 px-3 py-3 text-center" : "rounded-2xl border-2 border-slate-400 bg-slate-200 px-6 py-5 text-center"}>
                            <div className={pdfMode ? "text-lg font-normal leading-tight text-slate-900" : "text-2xl font-semibold text-slate-900"}>
                              {`${Math.round(totalSolarExport).toLocaleString()} kWh`}
                            </div>
                            <div className={pdfMode ? "mt-1 text-xs leading-tight text-slate-900" : "mt-1 text-sm text-slate-900"}>Exported to grid</div>
                          </div>

                        </div>

                        <p className={pdfMode ? "mt-3 mb-4 text-center text-xs leading-snug text-brand" : "mt-6 mb-9 text-center text-body text-brand"}>
                          Above is the data on how the electricity generated by your solar system is used over the year.
                          The energy you use and export will depend on your battery size and control settings, you can change 
                          the battery control setting further down and see how these figures change!
                        </p>
                      </div>


                      {/* Payback + IRR */}
                      <div className={pdfMode ? "mt-3 grid grid-cols-2 gap-2" : "mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"}>
                        <div className={pdfMode ? "rounded-2xl border-2 border-teal-200 bg-white p-2 text-center" : "rounded-2xl border-2 border-teal-200 bg-white p-4 text-center"}>
                          <div className={pdfMode ? "text-[11px] font-medium leading-tight text-brand" : "flex items-center justify-center text-s font-medium text-brand"}>
                            <span>Self Consumption</span>
                            <InfoTooltip text="The share of your solar generation that is used in your home or stored in the battery instead of being exported to the grid." />
                          </div>
                          <div className={pdfMode ? "mt-1 text-lg font-medium leading-tight text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                            {`${selfConsumptionPct.toFixed(0)} %`}
                          </div>
                          <div className={pdfMode ? "mt-1 text-[10px] leading-tight text-slate-500" : "mt-1 text-xs text-slate-500"}>
                            Share of solar generation used in the home
                          </div>
                        </div>

                        <div className={pdfMode ? "rounded-2xl border-2 border-teal-200 bg-white p-2 text-center" : "rounded-2xl border-2 border-teal-200 bg-white p-4 text-center"}>
                          <div className={pdfMode ? "text-[11px] font-medium leading-tight text-brand" : "flex items-center justify-center text-s font-medium text-brand"}>
                            <span>Energy Independence</span>
                            <InfoTooltip text="The share of your home’s annual electricity demand that is covered by solar energy, either used instantly or delivered later from the battery."/>
                            </div>
                          <div className={pdfMode ? "mt-1 text-lg font-medium leading-tight text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                            {`${selfSufficiencyPct.toFixed(0)} %`}
                          </div>
                          <div className={pdfMode ? "mt-1 text-[10px] leading-tight text-slate-500" : "mt-1 text-xs text-slate-500"}>
                            Share of home demand met by solar
                          </div>
                        </div>
                      </div>
                    </CardAlt2>
                  </div>

                  {/* Right: donut (1/3 width) */}
                  <div className={pdfMode ? "h-full mt-4" : "lg:col-span-1 h-full"}>
                    <CardAlt2
                      title="How Your Home Is Powered"
                      mode={mode}
                      className={pdfMode ? "h-full flex flex-col shadow-none" : "h-full flex flex-col"}
                      bodyClassName="flex h-full flex-col items-center justify-center"
                    >
                      <p className={pdfMode ? "mt-1 text-xs text-center leading-snug text-slate-600" : "mt-1 text-sm text-center text-slate-600"}>
                        Yearly share of your home’s electricity supplied by direct solar, 
                        battery power and direct grid import.
                      </p>

                      <div className={pdfMode ? "mt-2 flex-1 flex items-center shadow-none justify-center w-full" : "mt-5 flex-1 flex items-center justify-center w-full"}>
                        <SolarUsageDonut
                          direct={totalDirect}
                          battery={totalBatteryToHome}
                          grid={totalGridDirect}
                          pdfMode={pdfMode}
                        />
                      </div>
                    </CardAlt2>
                  </div>
                </div>

                {/* WHERE SOLAR GOES */}
                <div className={pdfMode ? "pdf-keep-together" : ""}>
                <div className="mt-6">
                  <Card
                    mode={mode} 
                    title="How Your Solar Energy Is Used">
                      <StackedMonthlyBarChart
                        labels={months}
                        series={[
                          { name: "Used directly in home", data: direct, className: "seg-direct" },
                          { name: "Stored in battery", data: battChargeFromPV, className: "seg-charge" },
                          { name: "Exported directly", data: pvExportDirect, className: "seg-export" },
                        ]}
                        pdfMode={pdfMode}
                      />
                  </Card>
                </div>
                </div>

                {/* FLOW VISUALS */}
                <div className="mt-6">
                  <EnergyFlowCards
                    mode={mode} 
                    hasBattery={hasBattery} />
                </div>
              </>
            );
            })()}
          </section>

          {isPdf && (
            <section id="mcs-performance" className="mt-1 pdf-page-break-before pdf-no-divider">
              <McsPerformanceTable data={mcsTableData} pdfMode={true} />
            </section>
          )}


          {/* =======================
                FINANCIALS (SaaS UI)
            ======================= */}
          <section id="financials" className={pdfMode ? "mt-1 pdf-page-break-before" : "mt-[2rem]"}>
            <SectionHeader
              title="Financials"
              description="How your system changes your energy bills and savings in the short and long term."
              mode={mode}
              action={!pdfMode && (<ButtonLink onClick={() => onEdit(2)}>Edit</ButtonLink>)}
            />
            {/* Badge row (subtle polish) */}
            <div className={pdfMode ? "mt-2 mb-3 flex items-center gap-2" : "mt-4 mb-8 flex items-center gap-2"}>
              <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                Annual bill savings
              </span>
              <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                Payback period & ROI
              </span>
            </div>

            {/* Financial snapshot (stats + Year 1 chart in one clean row) */}
            <div
              className={
                pdfMode
                  ? "mt-2 grid grid-cols-3 items-stretch gap-3" 
                  : "mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3 lg:gap-6"
              }
            >
              {/* Left: stats (2/3 width) */}
              <div className={pdfMode ? "col-span-2 h-full" : "lg:col-span-2 h-full"}>
              <CardAlt2 
                title="Financial Snapshot" 
                className="h-full"
                mode={mode}
                right={
                      !pdfMode && (
                        <button
                          type="button"
                          onClick={() => setMonthlySavingsModalOpen(true)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                        >
                          View monthly savings
                        </button>
                      )
                    }
              >
                {/* Benefit equation: 3 equal bubbles with operators */}
                <div className={pdfMode ? "mt-2" : "mt-4"}>
                  {pdfMode ? (
                    <div className="grid grid-cols-3 gap-2 items-stretch">
                      <div className="rounded-2xl bg-blue-100 px-2 py-3 text-center">
                        <div className="text-base font-normal leading-tight text-slate-900">
                          £{Number(quote.annualBillSavings || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[10px] leading-tight text-slate-500">
                          Bill saving
                        </div>
                      </div>

                      <div className="rounded-2xl bg-blue-100 px-2 py-3 text-center">
                        <div className="text-base font-normal leading-tight text-slate-900">
                          £{Number(quote.annualSegIncome || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[10px] leading-tight text-slate-500">
                          SEG income
                        </div>
                      </div>

                      <div className="rounded-2xl bg-blue-300 px-2 py-3 text-center">
                        <div className="text-lg font-normal leading-tight text-slate-900">
                          £{Number(quote.totalAnnualBenefit || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[10px] leading-tight text-slate-600">
                          Total annual saving
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:gap-4">
                      <div className="rounded-2xl bg-blue-100 px-6 py-4 text-center">
                        <div className="text-2xl font-semibold text-slate-900">
                          £{Number(quote.annualBillSavings || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-s text-slate-500">Bill saving</div>
                      </div>

                      <div className="hidden sm:block text-3xl font-medium text-teal-500 text-center">
                        +
                      </div>

                      <div className="rounded-2xl bg-blue-100 px-6 py-4 text-center">
                        <div className="text-2xl font-semibold text-slate-900">
                          £{Number(quote.annualSegIncome || 0).toLocaleString()}
                        </div>
                        <div className="flex items-center justify-center mt-1 text-s text-slate-500">
                          <span>SEG income</span>
                          <InfoTooltip text="Income earned from electricity exported to the grid under the Smart Export Guarantee."/>
                        </div>
                      </div>

                      <div className="hidden sm:block text-3xl font-medium text-teal-500 text-center">
                        =
                      </div>

                      <div className="rounded-2xl bg-blue-300 px-6 py-4 text-center">
                        <div className="text-3xl font-semibold text-slate-900">
                          £{Number(quote.totalAnnualBenefit || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-s text-slate-600">Total annual saving</div>
                      </div>
                    </div>
                  )}

                  {!pdfMode && (
                    <div className="mt-3 flex items-center justify-center gap-3 sm:hidden text-2xl font-medium text-slate-300">
                      <span>Bill saving</span>
                      <span>+</span>
                      <span>SEG income</span>
                      <span>=</span>
                      <span>Total</span>
                    </div>
                  )}

                  <p className={pdfMode ? "mt-2 text-center text-[11px] leading-snug text-slate-900" : "mt-4 text-center text-xs text-slate-900"}>
                    Total annual benefit is your combined bill savings and SEG export income in year one.
                  </p>
                </div>

                {/* Payback + IRR */}
                <div className={pdfMode ? "mt-3 grid grid-cols-2 gap-2" : "mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"}>
                  <div className={pdfMode ? "rounded-2xl border-2 border-teal-200 bg-white p-2 text-center" : "rounded-2xl border-2 border-teal-200 bg-white p-4 text-center"}>
                    <div className={pdfMode ? "text-[11px] font-medium leading-tight text-slate-500" : "flex items-center justify-center text-s font-medium text-slate-500"}>
                      <span>Projected payback</span>
                      <InfoTooltip text="The estimated number of years it takes for cumulative savings and export income to recover the upfront system cost." />
                    </div>
                    <div className={pdfMode ? "mt-1 text-lg font-medium leading-tight text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                      {quote?.financialSeries?.payback?.paybackYear != null
                        ? `${Number(quote.financialSeries.payback.paybackYear).toFixed(1)} yrs`
                        : "N/A"}
                    </div>
                    <div className={pdfMode ? "mt-1 text-[10px] leading-tight text-slate-500" : "mt-1 text-xs text-slate-500"}>
                      Including inflation & panel degradation
                    </div>
                  </div>

                  <div className={pdfMode ? "rounded-2xl border-2 border-teal-200 bg-white p-2 text-center" : "rounded-2xl border-2 border-teal-200 bg-white p-4 text-center"}>
                    <div className={pdfMode ? "text-[11px] font-medium leading-tight text-slate-500" : "text-s font-medium text-slate-500"}>
                      <span>Investment rate of return (IRR)</span>
                      <InfoTooltip text="A way of comparing the financial return of your solar investment over time, taking into account annual savings and system cost." />
                    </div>
                    <div className={pdfMode ? "mt-1 text-lg font-medium leading-tight text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                      {irrPct != null ? `${irrPct.toFixed(1)}%` : "N/A"}
                    </div>
                    <div className={pdfMode ? "mt-1 text-[10px] leading-tight text-slate-500" : "mt-1 text-xs text-slate-500"}>
                      Based on the 25-year system lifetime
                    </div>
                  </div>
                </div>
              </CardAlt2>
            </div>
            


            {/* Right: Year 1 chart (1/3 width) */}
            <div className={pdfMode ? "col-span-1 h-full" : "lg:col-span-1 h-full"}>
              <Card
                mode={mode} 
                title="Before vs After Solar" 
                className="h-full flex flex-col" 
                bodyClassName="flex flex-col">
                  <p className={pdfMode ? "mt-1 text-[11px] leading-snug text-slate-600 text-center" : "mt-1 text-small text-slate-600 text-centre"}>
                    Your 1st Year bill saving:{" "}
                    <span className="font-semibold text-slate-900">
                      {billSavingPctYear1 != null ? `${billSavingPctYear1.toFixed(1)}%` : "N/A"}
                    </span>
                  </p>
                  {quote?.financialSeries?.monthly ? (
                    <div className={pdfMode ? "mt-1 flex-1" : "mt-3 flex-1"}>
                      <TwoBarYearChart
                        title="" // Card provides title
                        leftLabel="Before solar"
                        leftValue={quote.financialSeries.monthly.annualBaseline || 0}
                        rightLabel="After solar"
                        rightValue={quote.financialSeries.monthly.annualSystemNet || 0}
                        valuePrefix="£"
                        pdfMode={pdfMode}
                      />
                    </div>
                ) : (
                  <p className="text-sm text-slate-500">Monthly financial series not available.</p>
                )}

              </Card>
            </div>
            </div>


            {/* Bottom: cumulative payback full width */}
            <div className={pdfMode ? "mt-3 pdf-keep-together" : ""}>
            <div className={pdfMode ? "mt-0" : "mt-6"}>
              <Card 
                mode={mode}
                title="Payback (cumulative savings by year)"
                right={
                    !pdfMode && (
                      <button
                        type="button"
                        onClick={() => setFinanceModalOpen(true)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        View full calculation details
                      </button>
                    )
                  }
                >
                
                {quote?.financialSeries?.payback ? (
                  <>
                  <CumulativePaybackBarChart
                    title="" // Card provides title
                    labels={quote.financialSeries.payback.labels || []}
                    cumulativeSavings={quote.financialSeries.payback.cumulativeSavings || []}
                    systemCost={quote.financialSeries.payback.systemCostMid}
                    paybackYear={quote?.financialSeries?.payback?.paybackYearIndex ?? null}
                    valuePrefix="£"
                    xAxisLabel="Years since installation"
                    footerRight={
                      <div className="text-xs text-slate-500">
                        Lifetime net savings:{" "}
                        <strong className="text-slate-900">
                          £{Math.round(quote.financialSeries.payback.lifetimeSavings || 0).toLocaleString()}
                        </strong>
                      </div>
                    }
                    caption={
                      <>
                        <div className="text-xs font-semibold uppercase tracking-wide text-test mt-6 ml-2">
                          MCS projection note
                        </div>

                        <p className={pdfMode ? "text-small text-slate-700 leading-6 p-2" : "text-sm text-slate-700 leading-6 p-2"}>
                          Your projected energy cost is calculated by considering a{" "}
                          <strong>{Math.round((quote?.tariff?.energyInflationRate ?? 0.06) * 100)}% increase</strong>{" "}
                          in energy cost each year, due to trends in the raising cost of energy. This estimate is based on your selected
                          preferences, current energy costs and the position and orientation of your roof to calculate the efficiency of the
                          system. <strong>Projections are based on estimated usage of{" "}
                          {(quote?.assumedAnnualConsumptionKWh || 0).toLocaleString()} kWh per year, assuming{" "}
                          {quote?.tariff?.tariffType || "Commercial Rate Electricity Tariff"} tariff.</strong>
                        </p>
                      </>
                    }
                  />
                </>
                ) : (
                  <p className="text-sm text-slate-500">Payback series not available.</p>
                )}
              </Card>
            </div>
            </div>

            {pdfMode && Array.isArray(quote?.financialSeries?.payback?.yearly) && (
              <div className="mt-4 pdf-full-calculation-page">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  Full calculation details
                </div>

                <FinanceDetailsTable
                  rows={quote.financialSeries.payback.yearly}
                  pdfMode={true}
                />

                <p className="mt-2 text-[11px] leading-snug text-slate-500">
                  Net position = cumulative bill savings minus system cost (mid price). Solar generation is held constant unless degradation is applied.
                </p>
              </div>
            )}
          </section>


          {/* =======================
                OPTIMISATIONS (SaaS UI)
            ======================= */}
          <section id="optimisations" className={pdfMode ? "mt-1 pdf-page-break-before" : "mt-[2rem]"}>
            <SectionHeader
              title="Optimisations"
              description="Here you can edit your tariff, change battery setting and find your optimal battery size."
              mode={mode}
              action={!pdfMode && (<ButtonLink onClick={() => onEdit(2)}>Edit</ButtonLink>)}
            />
            {/* Badge row (subtle polish) */}
            <div className={pdfMode ? "mt-2 mb-3 flex items-center gap-2" : "mt-4 mb-8 flex items-center gap-2"}>
              <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                Change your tariff
              </span>
              <span className={pdfMode ? "rounded-full bg-accent px-2 py-1 text-[10px] font-medium text-white" : "rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"}>
                Perfect your battery
              </span>
            </div>
            <div className={pdfMode ? "mt-4" : "mt-6"}>
              <Card
                mode={mode}
                title="System Settings & Options"
                right={!pdfMode && (<button
                type="button"
                onClick={() => recalcWithTariff()}
                className={getRecalcButtonClass(needsRecalc)}
                >
                  {needsRecalc ? "Recalculate results" : "Results up to date"}
                </button>)}
              >
              <div className={pdfMode ? "mt-1 rounded-2xl bg-white p-2" : "mt-1 rounded-2xl bg-white p-4"}>
                  <div className={pdfMode ? "rounded-2xl bg-white p-0" : "rounded-2xl bg-white p-1"}>
                    <div className={pdfMode ? "flex items-start justify-between gap-3" : "flex items-start justify-between gap-4"}>
                      <div>
                        <div className="text-body font-semibold uppercase tracking-wide text-accent">
                          Your Current Tariffs</div>
                        <div className={pdfMode ? "mb-1 text-sm text-slate-500" : "mb-2 text-body text-slate-500"}>
                          You can adjust these to see how savings change (no need to rerun the solar simulation).
                        </div>
                      </div>

                      {!pdfMode && (
                        <button
                          type="button"
                          onClick={() => onOpenTariffModal("before")}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit your tariffs
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className={isPdf ? "tariff-block tariff-block--pdf grid grid-cols-2 gap-3 text-sm" : "tariff-block grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"}>

                    {/* ================= BEFORE TARIFF ================= */}
                    <div className={pdfMode ? "rounded-xl border border-white p-3 bg-slate-100" : "rounded-xl border border-white p-4 bg-slate-100"}>
                      <div className={pdfMode ? 
                          "flex items-start justify-between gap-2 border-b-2 border-slate-200 text-sm font-semibold text-slate-900 mb-1" :
                          "flex items-start justify-between gap-2 border-b-2 border-slate-200 text-body font-semibold text-slate-900 mb-2"}>
                        Before Solar
                      </div>

                      <div className={pdfMode ? "space-y-1" : "space-y-2"}>

                        <Row
                          label="Tariff type"
                          value={tb?.tariffType || "standard"}
                        />

                        {/* STANDARD */}
                        {(!tb?.tariffType || tb?.tariffType === "standard") && (
                          <>
                            <Row
                              label="Import rate"
                              value={`£${Number(tb?.importPrice || 0).toFixed(2)}/kWh`}
                            />
                          </>
                        )}

                        {/* OVERNIGHT */}
                        {tb?.tariffType === "overnight" && (
                          <>
                            <Row
                              label={`Night rate (${fmtWindow(tb?.nightStartHour, tb?.nightEndHour)})`}
                              value={`£${Number(tb?.importNight || 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label="Day rate (all other hours)"
                              value={`£${Number(tb?.importDay || 0).toFixed(2)}/kWh`}
                            />
                          </>
                        )}

                        {/* FLUX */}
                        {tb?.tariffType === "flux" && (
                          <>
                            <Row
                              label={`Off-peak import (${fmtWindow(ta?.offPeakStartHour, ta?.offPeakEndHour)})`}
                              value={`£${Number(ta?.importOffPeak || 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label={`Peak import (${fmtWindow(ta?.peakStartHour, ta?.peakEndHour)})`}
                              value={`£${Number(ta?.importPeak || 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label="Day import (all other hours)"
                              value={`£${Number(ta?.importPrice || 0).toFixed(2)}/kWh`}
                            />

                            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Export schedule
                            </div>

                            <Row
                              label={`Off-peak export (${fmtWindow(ta?.offPeakStartHour, ta?.offPeakEndHour)})`}
                              value={`£${Number(ta?.exportOffPeak ?? ta?.segPrice ?? 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label={`Peak export (${fmtWindow(ta?.peakStartHour, ta?.peakEndHour)})`}
                              value={`£${Number(ta?.exportPeak ?? ta?.segPrice ?? 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label="Day export (all other hours)"
                              value={`£${Number(ta?.segPrice || 0).toFixed(2)}/kWh`}
                            />
                          </>
                        )}

                        <Row
                          label="Standing charge"
                          value={`£${Number(tb?.standingChargePerDay || 0).toFixed(2)}/day`}
                        />

                      </div>
                    </div>

                    {/* ================= AFTER TARIFF ================= */}
                    <div className={pdfMode ? "rounded-xl border border-white p-3 bg-blue-50" : "rounded-xl border border-white p-4 bg-blue-50"}>
                      <div className={pdfMode ? 
                        "flex items-start justify-between gap-2 border-b-2 border-blue-100 text-sm font-semibold text-slate-900 mb-1" : 
                        "flex items-start justify-between gap-2 border-b-2 border-blue-100 text-body font-semibold text-slate-900 mb-2"}>
                        After Solar
                      </div>

                      <div className={pdfMode ? "space-y-1" : "space-y-2"}>

                        <Row
                          label="Tariff type"
                          value={ta?.tariffType || "standard"}
                        />

                        {/* STANDARD */}
                        {ta?.tariffType === "standard" && (
                          <>
                            <Row
                              label="Import rate"
                              value={`£${Number(ta?.importPrice || 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label="Export rate"
                              value={`£${Number(ta?.segPrice || 0).toFixed(2)}/kWh`}
                            />
                          </>
                        )}

                        {/* OVERNIGHT */}
                        {ta?.tariffType === "overnight" && (
                          <>
                            <Row
                              label={`Night rate (${fmtWindow(ta?.nightStartHour, ta?.nightEndHour)})`}
                              value={`£${Number(ta?.importNight || 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label="Day rate (all other hours)"
                              value={`£${Number(ta?.importDay || 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label="Export rate"
                              value={`£${Number(ta?.segPrice || 0).toFixed(2)}/kWh`}
                            />
                          </>
                        )}

                        {/* FLUX */}
                        {ta?.tariffType === "flux" && (
                          <>
                            <Row
                              label={`Off-peak import (${fmtWindow(ta?.offPeakStartHour, ta?.offPeakEndHour)})`}
                              value={`£${Number(ta?.importOffPeak || 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label={`Peak import (${fmtWindow(ta?.peakStartHour, ta?.peakEndHour)})`}
                              value={`£${Number(ta?.importPeak || 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label="Day import (all other hours)"
                              value={`£${Number(ta?.importPrice || 0).toFixed(2)}/kWh`}
                            />

                            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Export schedule
                            </div>

                            <Row
                              label={`Off-peak export (${fmtWindow(ta?.offPeakStartHour, ta?.offPeakEndHour)})`}
                              value={`£${Number(ta?.exportOffPeak ?? ta?.segPrice ?? 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label={`Peak export (${fmtWindow(ta?.peakStartHour, ta?.peakEndHour)})`}
                              value={`£${Number(ta?.exportPeak ?? ta?.segPrice ?? 0).toFixed(2)}/kWh`}
                            />
                            <Row
                              label="Day export (all other hours)"
                              value={`£${Number(ta?.segPrice || 0).toFixed(2)}/kWh`}
                            />
                          </>
                        )}
                        <Row
                          label="Standing charge"
                          value={`£${Number(ta?.standingChargePerDay || 0).toFixed(2)}/day`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {pdfMode ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 pdf-keep-together">
                    <div className="text-sm font-semibold uppercase tracking-wide text-accent">
                      Battery controls
                    </div>
                    <div className="mb-2 text-sm text-slate-500">
                      These settings influence how the battery charges and discharges under time-of-use tariffs.
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-sm font-semibold text-slate-900">
                          Allow grid charging
                        </div>
                        <div className="mt-1 text-xs leading-snug text-slate-600">
                          Battery can charge from the grid during cheap hours, then discharge later to reduce imports.
                        </div>
                        <div className="mt-2 inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                          {batteryControls.allowGridCharging ? "ON" : "OFF"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-sm font-semibold text-slate-900">
                          Allow energy trading
                        </div>
                        <div className="mt-1 text-xs leading-snug text-slate-600">
                          Battery may charge cheap and export when profitable, depending on tariff settings and supplier rules.
                        </div>
                        <div className="mt-2 inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                          {batteryControls.allowEnergyTrading ? "ON" : "OFF"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                    {/* Header row: title/desc left, recalc right */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-body font-semibold uppercase tracking-wide text-accent">
                          Battery controls
                        </div>
                        <div className="mb-2 text-body text-slate-500">
                          These options affect how the battery behaves with time-of-use tariffs.
                          Depending on the tariff they may have little or no effect.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={recalcWithTariff}
                        className={getRecalcButtonClass(needsRecalc)}
                      >
                        {needsRecalc ? "Recalculate results" : "Results up to date"}
                      </button>
                    </div>

                    {/* 2-column layout */}
                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                      {/* Left: 2/5 controls */}
                      <div className="lg:col-span-1">
                        <div className="space-y-5">
                          {/* Toggle button: Allow grid charging */}
                          <button
                            type="button"
                            onClick={() => {
                              setBatteryControls((s) => {
                                const next = !s.allowGridCharging;

                                return {
                                  ...s,
                                  allowGridCharging: next,
                                  allowEnergyTrading: next ? s.allowEnergyTrading : false,
                                };
                              });

                              setNeedsRecalc(true);
                              setUpdatedSections([]);
                            }}
                            className={[
                              "w-full rounded-2xl border p-4 text-left transition",
                              batteryControls.allowGridCharging
                                ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-body font-semibold text-slate-900">
                                  Allow grid charging 
                                  <p>(overnight/off-peak)</p>
                                </div>
                                <div className="mt-1 text-sm text-slate-600">
                                  Battery can charge from the grid during cheap hours, then discharge later to reduce imports.
                                </div>
                              </div>

                              <div
                                className={[
                                  "min-w-[72px] rounded-full px-3 py-1 text-center text-xs font-bold",
                                  batteryControls.allowGridCharging
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-300 text-slate-800",
                                ].join(" ")}
                              >
                                {batteryControls.allowGridCharging ? "ON" : "OFF"}
                              </div>
                            </div>
                          </button>

                          {/* Toggle button: Allow energy trading */}
                          <button
                            type="button"
                            disabled={!batteryControls.allowGridCharging}
                            onClick={() => {
                              setBatteryControls((s) => ({
                                ...s,
                                allowEnergyTrading: !s.allowEnergyTrading,
                              }));

                              setNeedsRecalc(true);
                              setUpdatedSections([]);
                            }}
                            className={[
                              "w-full rounded-2xl border p-4 text-left transition",
                              !batteryControls.allowGridCharging
                                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                                : batteryControls.allowEnergyTrading
                                ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-body font-semibold text-slate-900">
                                  Allow energy trading 
                                  <p>(buy cheap → sell dear)</p>
                                </div>
                                <div className="mt-1 text-sm text-slate-600">
                                  If export rates are higher than cheap import (after losses), the battery may export grid-charged energy.
                                  This can increase savings, but may be unrealistic depending on supplier rules.
                                </div>
                              </div>

                              <div
                                className={[
                                  "min-w-[72px] rounded-full px-3 py-1 text-center text-xs font-bold",
                                  !batteryControls.allowGridCharging
                                    ? "bg-slate-300 text-slate-800"
                                    : batteryControls.allowEnergyTrading
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-300 text-slate-800",
                                ].join(" ")}
                              >
                                {batteryControls.allowEnergyTrading ? "ON" : "OFF"}
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Right: 3/5 powerflow graphs + toggles */}
                      <div className="lg:col-span-2">
                        {/* Graph selector */}
                        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPowerflowView("winter")}
                              className={[
                                "rounded-xl px-3 py-2 text-sm font-semibold transition",
                                powerflowView === "winter"
                                  ? "bg-slate-100 text-state-700 border border-slate-700"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                              ].join(" ")}
                            >
                              Winter day
                            </button>
                            <button
                              type="button"
                              onClick={() => setPowerflowView("summer")}
                              className={[
                                "rounded-xl px-3 py-2 text-sm font-semibold transition",
                                powerflowView === "summer"
                                  ? "bg-slate-100 text-state-700 border border-slate-700"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                              ].join(" ")}
                            >
                              Summer day
                            </button>
                          </div>

                          <div className="text-left p-1">
                            <div className="text-xs text-slate-600">
                              {(() => {
                                const grid = !!batteryControls.allowGridCharging;
                                const trade = !!batteryControls.allowEnergyTrading;

                                if (!grid && !trade) {
                                  return "Battery charges from solar surplus and discharges to reduce imports. No grid charging or trading.";
                                }
                                if (grid && !trade) {
                                  return "Battery may charge overnight/off-peak to reduce expensive imports later. Trading disabled.";
                                }
                                if (grid && trade) {
                                  return "Battery may charge cheap and export when profitable, while reserving energy to avoid higher import prices.";
                                }
                                return "Battery behaviour based on current tariff controls.";
                              })()}
                            </div>
                          </div>

                          <div className="mt-3 w-full">
                            {powerflowView === "winter" ? (
                              quote?.hourlyModel?.debugWinterDay?.hours ? (
                                <DayPowerChart
                                  title=""
                                  day={quote.hourlyModel.debugWinterDay}
                                />
                              ) : (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                  Winter day chart not available.
                                </div>
                              )
                            ) : quote?.hourlyModel?.debugSummerDay?.hours ? (
                              <DayPowerChart
                                title=""
                                day={quote.hourlyModel.debugSummerDay}
                              />
                            ) : (
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                Summer day chart not available.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                </Card>

                
                {isPdf && (
                  <Card>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 pdf-keep-together">
                      <div className="text-sm text-centre font-semibold text-slate-900">Winter day power flow</div>
                      <div className="mt-1 text-xs text-centre text-slate-600">
                        Typical winter day showing solar generation, home demand, battery charge/discharge and grid interaction.
                      </div>

                      <div className="mt-3">
                        {quote?.hourlyModel?.debugWinterDay?.hours ? (
                          <DayPowerChart
                            title=""
                            day={quote.hourlyModel.debugWinterDay}
                            pdfMode={true}
                          />
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            Winter day chart not available.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3 pdf-keep-together">
                      <div className="text-sm text-centre font-semibold text-slate-900">Summer day power flow</div>
                      <div className="mt-1 text-xs text-centre text-slate-600">
                        Typical summer day showing solar generation, home demand, battery charge/discharge and grid interaction.
                      </div>

                      <div className="mt-3">
                        {quote?.hourlyModel?.debugSummerDay?.hours ? (
                          <DayPowerChart
                            title=""
                            day={quote.hourlyModel.debugSummerDay}
                            pdfMode={true}
                          />
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            Summer day chart not available.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </Card>
                )}

            </div>
          </section>

          {/* ============================
              Battery recommendations
          ============================ */}
          <div className={pdfMode ? "pdf-keep-together mb-4" : ""}>
            {quote?.batteryRecommendations && (
              <Card
                mode={mode} 
                title="Battery Recommendations"
                right={!pdfMode && (<button
                type="button"
                onClick={() => recalcWithTariff()}
                className={getRecalcButtonClass(needsRecalc)}
                >
                  {needsRecalc ? "Recalculate results" : "Results up to date"}
                </button>)}
                >

                <div>
                  <p className={pdfMode ? "mt-1 text-sm leading-snug text-slate-700" : "mt-1 text-body text-slate-700"}>
                    Knowing which battery capacity you need is difficult! So here are two options for you,
                    currently based on a comparison period of{" "}
                    <strong>
                      {quote?.batteryRecommendations?.assumptions?.lifetimeYears || batteryRecommendationLifetimeYears} years
                    </strong>.
                  </p>
                </div>

                <div className={pdfMode ? "mt-3 grid grid-cols-1 gap-3" : "mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]"}>
                  
                  {/* LEFT COLUMN: settings (now wider) */}
                  {!pdfMode && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold uppercase tracking-wide text-accent">
                            Adjust the Lifetime Savings Period
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            The slider below allows you to adjust how many years we use for lifetime savings. Simply move the slider and hit recalculate!
                            This will only affect your battery recommendation and the cumulative payback chart in the financial section. 
                          </p>
                        </div>

                        <div className="rounded-2xl border border-accent bg-accent/5 px-4 py-3 text-center min-w-[140px]">
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Active lifetime
                          </div>
                          <div className="mt-1 text-2xl font-semibold text-slate-900">
                            {quote?.batteryRecommendations?.assumptions?.lifetimeYears || batteryRecommendationLifetimeYears} years
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        {/* Floating badge above slider */}
                        <div className="relative px-1">
                          <div
                            className="absolute -top-6 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-md"
                            style={{
                              left: `${((batteryRecommendationLifetimeYears - 5) / (30 - 5)) * 100}%`,
                            }}
                          >
                            {batteryRecommendationLifetimeYears}y
                          </div>

                          <input
                            type="range"
                            min="5"
                            max="30"
                            step="1"
                            value={batteryRecommendationLifetimeYears}
                            onChange={(e) => {
                              setBatteryRecommendationLifetimeYears(Number(e.target.value))
                              setNeedsRecalc(true);
                              setUpdatedSections([]);
                            }}
                            className="w-full"
                          />
                        </div>

                        <div className="mt-3 flex justify-between text-xs text-slate-500">
                          <span>5 years</span>
                          <span>10 years</span>
                          <span>15 years</span>
                          <span>20 years</span>
                          <span>25 years</span>
                          <span>30 years</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RIGHT COLUMN: stacked recommendations */}
                  <div className="flex flex-col gap-4">
                  <div className={isPdf ? "battery-rec-grid battery-rec-grid--pdf" : "battery-rec-grid"}>

                    {/* Fastest payback */} 
                    <div className={pdfMode ? "rounded-2xl border border-slate-200 bg-white p-3 text-center" : "rounded-2xl border border-slate-200 bg-white p-4 text-center"}> 
                      <div className={pdfMode ? "text-[11px] font-medium leading-tight text-slate-500" : "flex items-center justify-center text-s font-medium text-slate-500"}>
                        <span>Fastest payback</span>
                        <InfoTooltip text="The battery size that recovers its extra cost in the shortest time based on your selected tariff and battery settings." />
                      </div> 

                      <div className={pdfMode ? "mt-1 text-xl font-medium leading-tight text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {quote.batteryRecommendations.bestPayback 
                        ? `${quote.batteryRecommendations.bestPayback.batteryKWhUsable} kWh`
                        : "N/A"} 
                      </div>

                      {quote.batteryRecommendations.bestPayback && ( 
                        <div className={pdfMode ? "mt-1 text-[10px] leading-snug text-slate-500" : "mt-1 text-xs text-slate-500"}>
                          Payback: {quote.batteryRecommendations.bestPayback.paybackYears ?? "—"} yrs •
                          Annual benefit: £{Number(quote.batteryRecommendations.bestPayback.annualBenefit || 0).toLocaleString()}
                        </div>
                      )} 
                    </div> 

                    {/* Max lifetime savings */} 
                    <div className={pdfMode ? "rounded-2xl border border-slate-200 bg-white p-3 text-center" : "rounded-2xl border border-slate-200 bg-white p-4 text-center"}>
                      <div className={pdfMode ? "text-[11px] font-medium leading-tight text-slate-500" : "flex items-center justify-center text-s font-medium text-slate-500"}>
                        <span>Max lifetime net savings</span>
                        <InfoTooltip text="The battery size that produces the highest total net savings over the selected comparison period, even if it does not pay back the fastest." /> 
                      </div>

                      <div className={pdfMode ? "mt-1 text-xl font-medium leading-tight text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {quote.batteryRecommendations.bestLifetimeSavings
                        ? `${quote.batteryRecommendations.bestLifetimeSavings.batteryKWhUsable} kWh`
                        : "N/A"}
                      </div>
                    
                      {quote.batteryRecommendations.bestLifetimeSavings && (
                        <div className={pdfMode ? "mt-1 text-[10px] leading-snug text-slate-500" : "mt-1 text-xs text-slate-500"}>
                          Net savings: £{Number(quote.batteryRecommendations.bestLifetimeSavings.lifetimeNetSavings || 0).toLocaleString()} • 
                          Payback: {quote.batteryRecommendations.bestLifetimeSavings.paybackYears ?? "—"} yrs 
                        </div>
                      )} 
                    </div> 

                  </div>  
                  </div>
                </div>

                {quote.batteryRecommendations.bestPayback &&
                  quote.batteryRecommendations.bestLifetimeSavings &&
                  quote.batteryRecommendations.bestPayback.batteryKWhUsable ===
                    quote.batteryRecommendations.bestLifetimeSavings.batteryKWhUsable && (
                    <p
                      className={
                        pdfMode
                          ? "mt-2 text-[10px] leading-snug text-slate-500"
                          : "mt-4 text-xs text-slate-500"
                      }
                    >
                      Both recommendations select the same battery size for this home.
                    </p>
                  )}
              </Card>
            )}
          </div>

          {/* ====================
              PDF Loading Screen
          ======================= */}
          {pdfLoading && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-accent" />

                <h3 className="text-lg font-semibold text-slate-900">
                  Preparing your PDF quote
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  Please wait while we generate your proposal.
                </p>
              </div>
            </div>
          )}

          {/* =======================
                NEXT STEPS (SaaS UI)
            ======================= */}
          {!pdfMode && (
          <section id="next-steps" className="mt-[2rem]">
            <NextStepsPanel
              quote={quote}
              onEmailQuote={onEmailQuoteLead}
              onRequestCall={onRequestCallLead}
              onDownloadPdf={handlePdfDownload}
              infoUrl="https://YOUR-WEBSITE-URL-HERE/information-centre/"
              initialName={form.name}
              initialEmail={form.email}
              initialPhone={form.phone}
            />
          </section>
          )}
        </div>
      </div>
      <FinanceDetailsModal
      open={financeModalOpen}
      onClose={() => setFinanceModalOpen(false)}
      rows={quote?.financialSeries?.payback?.yearly || []}
      />
      <MonthlySavingsModal
        open={monthlySavingsModalOpen}
        onClose={() => setMonthlySavingsModalOpen(false)}
        rows={monthlySavingsRows}
      />
      <McsPerformanceModal
        open={mcsModalOpen}
        onClose={() => setMcsModalOpen(false)}
        data={mcsTableData}
      />
    </div>
  );
}


//==================\\
//Bar Chart Creation\\
//==================\\

function StackedMonthlyBarChart({ title, labels, series, pdfMode = false }) {
  const chartHeight = pdfMode ? 220 : 280;
  const showTooltip = !pdfMode;
  const animate = !pdfMode;

  // series = [{ name, data, className }]
  // data arrays must be length 12

  const totals = labels.map((_, i) =>
    series.reduce((sum, s) => sum + Number(s.data[i] || 0), 0)
  );

  const maxTotal = Math.max(...totals, 1);

  return (
    <div className="chart-card stacked-chart">
      <div className="chart-head">
        <h4 className="chart-title">{title}</h4>
        <div className="chart-legend">
          {series.map((s) => (
            <div key={s.name} className="legend-item">
              <span className={`legend-swatch ${s.className}`} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-bars">
        {labels.map((label, i) => {
          let stackedSoFar = 0;

          return (
            <div key={label} className="chart-col">
              <div className="chart-stack">
                {series.map((s) => {
                  const val = Number(s.data[i] || 0);
                  const heightPct = (val / maxTotal) * 100;
                  const bottomPct = (stackedSoFar / maxTotal) * 100;
                  stackedSoFar += val;

                  return (
                    <div
                      key={s.name}
                      className={`chart-seg ${s.className}`}
                      style={{ height: `${heightPct}%`, bottom: `${bottomPct}%` }}
                      title={`${label} • ${s.name}: ${Math.round(val).toLocaleString()} kWh`}
                    />
                  );
                })}
              </div>
              <div className="chart-label">{label}</div>
            </div>
          );
        })}
      </div>

      <p className="small-print">
        Hover a bar segment to see the exact monthly kWh.
      </p>
    </div>
  );
}

function SolarUsageDonut({ direct, battery, grid, pdfMode = false }) {
  const total = direct + battery + grid || 1;

  const dPct = (direct / total) * 100;
  const bPct = (battery / total) * 100;
  const gPct = (grid / total) * 100;

  const r = 42;
  const c = 2 * Math.PI * r;

  const dArc = (dPct / 100) * c;
  const bArc = (bPct / 100) * c;
  const gArc = (gPct / 100) * c;

  const svgSize = pdfMode ? 160 : 190;
  const outerClass = pdfMode
    ? "flex flex-row items-center justify-center gap-4 w-full"
    : "flex flex-col items-center justify-center";

  const legendWrapClass = pdfMode
    ? "grid w-auto grid-cols-1 gap-2 text-xs"
    : "mt-4 grid w-full max-w-[320px] grid-cols-3 gap-2 text-sm";

  const legendItemClass = pdfMode
    ? "flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"
    : "flex flex-col items-center rounded-xl bg-slate-50 gap-1 px-7 py-3";

  const labelClass = pdfMode
    ? "text-xs text-slate-700"
    : "text-body text-center text-slate-700";

  const valueClass = pdfMode
    ? "ml-auto text-sm font-semibold text-slate-900"
    : "text-stat font-semibold text-slate-900";

  return (
    <div
      className={outerClass}
      style={pdfMode ? { boxShadow: "none", filter: "none" } : undefined}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 100 100"
        className="overflow-visible shrink-0"
      >
        <g transform="rotate(-90 50 50)">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={pdfMode ? "9" : "10"}
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#facc15"
            strokeWidth={pdfMode ? "9" : "10"}
            strokeDasharray={`${dArc} ${c}`}
            strokeDashoffset="0"
            strokeLinecap="butt"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#2563eb"
            strokeWidth={pdfMode ? "9" : "10"}
            strokeDasharray={`${bArc} ${c}`}
            strokeDashoffset={-dArc}
            strokeLinecap="butt"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={pdfMode ? "9" : "10"}
            strokeDasharray={`${gArc} ${c}`}
            strokeDashoffset={-(dArc + bArc)}
            strokeLinecap="butt"
          />
        </g>

        <text
          x="50"
          y="46"
          textAnchor="middle"
          fontSize={pdfMode ? "5.5" : "6"}
          fill="#64748b"
        >
          Home energy
        </text>
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize={pdfMode ? "7" : "8"}
          fontWeight="600"
          fill="#0f172a"
        >
          100%
        </text>
      </svg>

      <div className={legendWrapClass}>
        <div className={legendItemClass}>
          <span className="h-3 w-3 rounded-full bg-amber-400 shrink-0" />
          <span className={labelClass}>Solar Direct</span>
          <span className={valueClass}>{dPct.toFixed(0)}%</span>
        </div>

        <div className={legendItemClass}>
          <span className="h-3 w-3 rounded-full bg-indigo-500 shrink-0" />
          <span className={labelClass}>Via Battery</span>
          <span className={valueClass}>{bPct.toFixed(0)}%</span>
        </div>

        <div className={legendItemClass}>
          <span className="h-3 w-3 rounded-full bg-slate-300 shrink-0" />
          <span className={labelClass}>Grid Direct</span>
          <span className={valueClass}>{gPct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}


function DailyUsageLineChart({ profile, pdfMode = false }) {
  if (!profile?.labels?.length || !profile?.kWh?.length) return null;

  const labels = profile.labels;   // 24 labels
  const data = profile.kWh;        // 24 kWh values
  const yMax = profile.yMax ?? Math.ceil(Math.max(...data, 0) + 1);

  // Use a "real" coordinate system with padding to prevent clipping
  const W = pdfMode ? 650 : 320;
  const H = pdfMode ? 150 : 110;

  const PAD_L = pdfMode ? 44 : 44;   // y-axis labels space
  const PAD_R = pdfMode ? 6 : 12;
  const PAD_T = 1;                  // top padding prevents clipping at the top
  const PAD_B = pdfMode ? 8 : 8;    // x-axis labels space
   

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const x = (i) => PAD_L + (i / (data.length - 1)) * plotW;
  const y = (v) => PAD_T + (1 - (v / yMax)) * plotH;

  const linePath = data
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
    .join(" ");

  const areaPath = `
    M ${PAD_L} ${PAD_T + plotH}
    ${data.map((v, i) => `L ${x(i)} ${y(v)}`).join(" ")}
    L ${PAD_L + plotW} ${PAD_T + plotH}
    Z
  `;
 
  // Y ticks 5 equally spaced guide bars: 0%, 25%, 50%, 75%, 100% of yMax
  const ticks = Array.from({ length: 6 }, (_, i) => {
    const value = (yMax * i) / 5;
    const label = value.toFixed(1);
    return { value, label };
  });

  return (
    <div className={pdfMode ? "chart-card daily-usage-chart pdf-usage-chart" : "chart-card daily-usage-chart"}>
      <div className="chart-head">
        <h4 className="chart-title">Typical daily energy usage</h4>

        {/* Key styled like StackedMonthlyBarChart */}
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-swatch legend-swatch--line" />
            <span>Demand</span>
          </div>
        </div>
      </div>
      <svg className="daily-usage-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Y grid + labels */}
        {ticks.map((t) => {
          const ty = y(t.value);
          return (
            <g key={t.value}>
              <line
                x1={PAD_L}
                y1={ty}
                x2={PAD_L + plotW}
                y2={ty}
                stroke="rgba(0,0,0,0.08)"
                strokeWidth="1"
              />
              <text
                x={PAD_L - 8}
                y={ty}
                fontSize={pdfMode ? "9" : "8"}
                textAnchor="end"
                dominantBaseline="middle"
                fill="rgba(0,0,0,0.65)"
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {/* Y axis title */}
        <text
          x={14}
          y={PAD_T + plotH / 2}
          fontSize={pdfMode ? "9" : "8"}
          fill="rgba(0,0,0,0.65)"
          transform={`rotate(-90 14 ${PAD_T + plotH / 2})`}
          textAnchor="middle"
        >
          kWh demand
        </text>

        {/* Filled area */}
        <path d={areaPath} fill="rgba(37, 99, 235, 0.15)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#233dff" strokeWidth="2" />

        {/* X labels every 4th hour */}
        {labels.map((lab, i) => {
          if (i % 4 !== 0) return null; // 00:00, 04:00, 08:00...
          return (
            <text
              key={lab}
              x={x(i)}
              y={PAD_T + plotH + 16}
              fontSize={pdfMode ? "9" : "8"}
              textAnchor="middle"
              fill="rgba(0,0,0,0.65)"
            >
              {lab}
            </text>
          );
        })}
      </svg>
    </div>
  );
}




function TwoBarYearChart({ title, leftLabel, leftValue, rightLabel, rightValue, valuePrefix = "", pdfMode = false }) {
    const chartHeightPx = pdfMode ? 110 : 160;
  const maxVal = Math.max(1, Number(leftValue || 0), Number(rightValue || 0));

  const leftH = Math.max(2, (Number(leftValue || 0) / maxVal) * chartHeightPx);
  const rightH = Math.max(2, (Number(rightValue || 0) / maxVal) * chartHeightPx);

  return (
    <div className={pdfMode ? "chart-card pdf-two-bar-chart" : "chart-card"}>
      <div className="chart-head">
        <h4 className="chart-title">{title}</h4>
      </div>

      <div
        className="year2bar-wrap"
        style={{ height: `${chartHeightPx + (pdfMode ? 48 : 70)}px` }}
      >
        <div className="year2bar-col">
          <div
            className="year2bar-bar bill-before"
            style={{ height: `${leftH}px` }}
            title={`${leftLabel}: ${valuePrefix}${Math.round(leftValue).toLocaleString()}`}
          />
          <div className={pdfMode ? "year2bar-label pdf-year2bar-label" : "year2bar-label"}>
            {leftLabel}
          </div>
          <div className={pdfMode ? "year2bar-value pdf-year2bar-value" : "year2bar-value"}>
            {valuePrefix}{Math.round(leftValue).toLocaleString()}
          </div>
        </div>

        <div className="year2bar-col">
          <div
            className="year2bar-bar bill-after"
            style={{ height: `${rightH}px` }}
            title={`${rightLabel}: ${valuePrefix}${Math.round(rightValue).toLocaleString()}`}
          />
          <div className={pdfMode ? "year2bar-label pdf-year2bar-label" : "year2bar-label"}>
            {rightLabel}
          </div>
          <div className={pdfMode ? "year2bar-value pdf-year2bar-value" : "year2bar-value"}>
            {valuePrefix}{Math.round(rightValue).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}


function CumulativePaybackBarChart({
  title,
  labels,
  cumulativeSavings,
  systemCost,
  paybackYear,
  valuePrefix = "£",
  footerRight = null,
  caption,
  xAxisLabel,
}) {
  const maxVal = Math.max(1, Number(systemCost || 0), ...(cumulativeSavings || []).map(v => Number(v || 0)));

  return (
    <div className="chart-card payback-chart">
      <div className="chart-head">
        <h4 className="chart-title">{title}</h4>
        {footerRight ? <div className="chart-right">{footerRight}</div> : null}
      </div>

      <div className="chart-bars">
        {(labels || []).map((lab, i) => {
          const val = Number(cumulativeSavings?.[i] || 0);
          const h = (val / maxVal) * 100;

          const reached = systemCost != null && val >= systemCost;
          const isPayback = paybackYear != null && i === paybackYear;

          return (
            <div key={lab} className="chart-col">
              <div
                className={`chart-stack ${reached ? "payback-reached" : ""} ${isPayback ? "payback-hit" : ""}`}
                title={`Year ${lab}: ${valuePrefix}${Math.round(val).toLocaleString()}`}
              >
                <div className="chart-seg payback-bar" style={{ height: `${h}%`, bottom: 0 }} />
                {/* cost marker */}
                {systemCost != null && (
                  <div
                    className="cost-marker"
                    style={{ bottom: `${(Number(systemCost) / maxVal) * 100}%` }}
                    title={`System cost: ${valuePrefix}${Math.round(systemCost).toLocaleString()}`}
                  />
                )}
              </div>

              <div className="chart-label">{lab}</div>
            </div>
          );
        })}
      </div>

      {/* ✅ NEW: X-axis label */}
      {xAxisLabel && (
        <div className="mt-3 text-center text-xs font-medium text-slate-500">
          {xAxisLabel}
        </div>
      )}

      {caption ? (
              <div className="mt-1 border-t border-slate-100 pt-3 pl-2 pr-2">
                {caption}
              </div>
            ) : null}
  </div>
  );
}



function GroupedMonthlyBarChart({ title, labels, series, valuePrefix = "" }) {
  // series = [{ name, data, className }]
  const maxVal = Math.max(
    1,
    ...labels.map((_, i) => Math.max(...series.map((s) => Number(s.data[i] || 0))))
  );

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h4 className="chart-title">{title}</h4>
        <div className="chart-legend">
          {series.map((s) => (
            <div key={s.name} className="chart-legend-item">
              <span className={`legend-swatch ${s.className}`} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grouped-chart-bars">
        {labels.map((label, i) => (
          <div key={label} className="chart-col">
            <div className="grouped-bar-wrap">
              {series.map((s) => {
                const val = Number(s.data[i] || 0);
                const h = (val / maxVal) * 100;

                return (
                  <div
                    key={s.name}
                    className={`grouped-bar ${s.className}`}
                    style={{ height: `${h}%` }}
                    title={`${label} • ${s.name}: ${valuePrefix}${Math.round(val).toLocaleString()}`}
                  />
                );
              })}
            </div>
            <div className="chart-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChartCard({
  title,
  labels,
  data,
  yLabelPrefix = "",
  referenceLineValue = null,
  referenceLineLabel = "",
  highlightXIndex = null,
  footerRight = null,
}) {
  // Simple responsive SVG line chart
  const W = 800;
  const H = 260;
  const pad = 30;

  const maxY = Math.max(1, ...(data || []).map((v) => Number(v || 0)), Number(referenceLineValue || 0));
  const minY = 0;

  const xFor = (i) => {
    const n = Math.max(2, (data || []).length);
    return pad + (i * (W - pad * 2)) / (n - 1);
  };

  const yFor = (v) => {
    const t = (Number(v || 0) - minY) / (maxY - minY);
    return H - pad - t * (H - pad * 2);
  };

  const points = (data || []).map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h4 className="chart-title">{title}</h4>
        {footerRight ? <div className="chart-right">{footerRight}</div> : null}
      </div>

      <div className="linechart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="linechart-svg" role="img">
          {/* Axes */}
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="axis" />
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} className="axis" />

          {/* Reference line (system cost) */}
          {referenceLineValue != null && (
            <>
              <line
                x1={pad}
                y1={yFor(referenceLineValue)}
                x2={W - pad}
                y2={yFor(referenceLineValue)}
                className="ref-line"
              />
              <text x={W - pad} y={yFor(referenceLineValue) - 6} textAnchor="end" className="ref-text">
                {referenceLineLabel}
              </text>
            </>
          )}

          {/* Main line */}
          <polyline points={points} className="line" fill="none" />

          {/* Highlight point (payback year) */}
          {highlightXIndex != null && data?.[highlightXIndex] != null && (
            <circle cx={xFor(highlightXIndex)} cy={yFor(data[highlightXIndex])} r="6" className="dot" />
          )}

          {/* Min/Max labels */}
          <text x={pad} y={pad - 8} className="axis-text">
            {yLabelPrefix}{Math.round(maxY).toLocaleString()}
          </text>
          <text x={pad} y={H - 10} className="axis-text">
            {yLabelPrefix}0
          </text>
        </svg>
      </div>

      <div className="linechart-xlabels">
        {/* show a few labels to avoid clutter */}
        {labels?.map((lab, i) => {
          const n = labels.length;
          const show = i === 0 || i === n - 1 || (n > 6 && i % 5 === 0);
          return show ? (
            <span key={lab} className="xlab">
              {lab}
            </span>
          ) : (
            <span key={lab} className="xlab muted"> </span>
          );
        })}
      </div>
    </div>
  );
}

function SimpleLine({ title, series = [], labels = [] }) {
  const w = 700, h = 220, pad = 28;

  if (!Array.isArray(series) || series.length === 0) return null;

  const safeSeries = series.map(s => ({
    name: s?.name || "",
    data: Array.isArray(s?.data) ? s.data : []
  }));

  const all = safeSeries.flatMap(s => s.data);
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 1);

  const x = (i) =>
    pad + (i * (w - 2 * pad)) / Math.max(1, labels.length - 1);

  const y = (v) =>
    pad + (h - 2 * pad) * (1 - (v - min) / (max - min || 1));

  const pathFor = (data) =>
    data.map((v, i) =>
      `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`
    ).join(" ");

  // 🎨 Color palette
  const colors = [
    "#2563eb", // blue
    "#16a34a", // green
    "#dc2626", // red
    "#f59e0b", // amber
    "#7c3aed", // purple
    "#0ea5e9", // sky
    "#ea580c", // orange
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>

      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full">
        {safeSeries.map((s, idx) => (
          <path
            key={idx}
            d={pathFor(s.data)}
            fill="none"
            stroke={colors[idx % colors.length]}  // ✅ colored line
            strokeWidth="2"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        {safeSeries.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            {s.name}
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-slate-500">Hours: 0–23</div>
    </div>
  );
}


function DayPowerChart({ title, day, pdfMode = false }) {
  if (!day || !Array.isArray(day.hours) || day.hours.length < 2) return null;

  const hours = day.hours;
  const pv = (day.pv || []).map(Number);
  const load = (day.load || []).map(Number);

  const exportKWh = (day.exportKWh || []).map(Number);
  const chPV = (day.battChargeFromPVKWh || []).map(Number);
  const chGrid = (day.battChargeFromGridKWh || []).map(Number);
  const disLoad = (day.battDischargeToLoadKWh || []).map(Number);
  const disExp = (day.battDischargeToExportKWh || []).map(Number);

  const n = Math.min(
    hours.length,
    pv.length || hours.length,
    load.length || hours.length
  );

  const safe = (arr) => Array.from({ length: n }, (_, i) => Number(arr?.[i] || 0));

  const PV = safe(pv);
  const LOAD = safe(load).map((v) => -Math.max(0, v));
  const EXPORT = safe(exportKWh);

  const BATT = Array.from({ length: n }, (_, i) => {
    const discharge = (Number(disLoad[i] || 0) + Number(disExp[i] || 0));
    const charge = (Number(chPV[i] || 0) + Number(chGrid[i] || 0));
    return discharge - charge;
  });

  const NET = Array.from({ length: n }, (_, i) => ((PV[i] + BATT[i]) + LOAD[i]));
  const EXPORT_NEG = safe(exportKWh).map((v) => -Math.max(0, v));

  const all = [0, ...PV, ...LOAD, ...NET, ...EXPORT_NEG, ...BATT];
  let minV = Math.min(...all);
  let maxV = Math.max(...all);

  const padPct = 0.12;
  const span = (maxV - minV) || 1;
  minV = minV - span * padPct;
  maxV = maxV + span * padPct;

  const w = pdfMode ? 660 : 760;
  const h = pdfMode ? 190 : 260;
  const padL = pdfMode ? 32 : 42;
  const padR = pdfMode ? 12 : 18;
  const padT = pdfMode ? 10 : 18;
  const padB = pdfMode ? 24 : 34;

  const x = (i) =>
    padL + (i * (w - padL - padR)) / Math.max(1, n - 1);

  const y = (v) =>
    padT + (h - padT - padB) * (1 - (v - minV) / (maxV - minV || 1));

  const y0 = y(0);

  const tickHours = [4, 8, 12, 16, 20];
  const hourLabel = (h) => {
    if (h === 12) return "12pm";
    if (h === 0) return "12am";
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
  };

  function niceStep(rawStep) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const frac = rawStep / pow;

    let niceFrac = 1;
    if (frac <= 1) niceFrac = 1;
    else if (frac <= 2) niceFrac = 2;
    else if (frac <= 2.5) niceFrac = 2.5;
    else if (frac <= 5) niceFrac = 5;
    else niceFrac = 10;

    return niceFrac * pow;
  }

  function buildYTicks(minVal, maxVal, tickCount = 6) {
    const span = Math.max(1e-9, maxVal - minVal);
    const step = niceStep(span / (tickCount - 1));
    const niceMin = Math.floor(minVal / step) * step;
    const niceMax = Math.ceil(maxVal / step) * step;

    const ticks = [];
    for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
      ticks.push(Number(v.toFixed(6)));
    }
    return ticks;
  }

  const yTicks = buildYTicks(minV, maxV, 6);

  function smoothPath(arr, tension = 0.16) {
    const pts = arr.map((v, i) => ({ x: x(i), y: y(v), v }));
    if (pts.length < 2) return "";

    if (pts.length === 2) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    }

    const t = tension;
    let d = `M ${pts[0].x} ${pts[0].y}`;

    const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      let c1x = p1.x + (p2.x - p0.x) * t;
      let c1y = p1.y + (p2.y - p0.y) * t;
      let c2x = p2.x - (p3.x - p1.x) * t;
      let c2y = p2.y - (p3.y - p1.y) * t;

      const yMin = Math.min(p1.y, p2.y);
      const yMax = Math.max(p1.y, p2.y);

      c1y = clamp(c1y, yMin, yMax);
      c2y = clamp(c2y, yMin, yMax);

      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }

    return d;
  }

  function smoothAreaToZero(arr, tension = 0.16) {
    const top = smoothPath(arr, tension);
    if (!top) return "";
    return `${top} L ${x(n - 1)} ${y0} L ${x(0)} ${y0} Z`;
  }

  return (
    <div className={pdfMode ? "rounded-2xl bg-white p-1" : "rounded-2xl bg-white p-2"}>
      <div className={pdfMode ? "flex justify-center text-center text-sm font-semibold text-slate-900" : "flex justify-center text-body font-semibold text-slate-900"}>
        {title}
      </div>

      <div className={pdfMode ? "flex justify-center mb-3 mt-0 flex-wrap gap-3 text-[11px] text-slate-700" : "flex justify-center mb-6 mt-0 flex flex-wrap gap-4 text-xs text-slate-700"}>
        <LegendDot color="#000000" label="Home demand" />
        <LegendDot color="#facc15" label="Generation" />
        <LegendDot color="#94a3b8" label="Net consumption" />
        <LegendDot color="#dc2626" label="Export" />
        <LegendDot color="#2563eb" label="Battery" />
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className={pdfMode ? "mt-1 w-full" : "mt-3 w-full"}>
        <line x1={padL} y1={y0} x2={w - padR} y2={y0} stroke="#cbd5e1" strokeWidth="1" />

        <path d={smoothAreaToZero(PV, 0.18)} fill="rgba(250, 204, 21, 0.50)" stroke="none" />
        <path d={smoothAreaToZero(NET, 0.18)} fill="rgba(148, 163, 184, 0.30)" stroke="none" />
        <path d={smoothAreaToZero(EXPORT, 0.18)} fill="rgba(220, 38, 38, 1)" stroke="none" />
        <path d={smoothAreaToZero(BATT, 0.18)} fill="rgba(37, 99, 235, 0.25)" stroke="none" />

        <path d={smoothPath(PV, 0.18)} fill="none" stroke="rgba(250, 204, 21, 0.50)" strokeWidth="0" />
        <path d={smoothPath(NET, 0.18)} fill="none" stroke="rgba(148, 163, 184, 0.30" strokeWidth="1" />
        <path d={smoothPath(EXPORT, 0.18)} fill="none" stroke="#dc2626" strokeWidth="0" />
        <path d={smoothPath(BATT, 0.18)} fill="none" stroke="rgba(37, 99, 235, 0.25)" strokeWidth="1" />
        <path d={smoothPath(LOAD, 0.18)} fill="none" stroke="#000000" strokeWidth={pdfMode ? "2" : "2.5"} />

        {tickHours.map((th) => {
          const i = Math.min(n - 1, Math.max(0, th));
          return (
            <g key={th}>
              <line
                x1={x(i)}
                y1={h - padB}
                x2={x(i)}
                y2={h - padB + 5}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text
                x={x(i)}
                y={h - 8}
                textAnchor="middle"
                fontSize={pdfMode ? "10" : "11"}
                fill="#64748b"
              >
                {hourLabel(th)}
              </text>
            </g>
          );
        })}

        {yTicks.map((tv) => {
          const yy = y(tv);
          const yBottom = h - padB;
          if (yy > yBottom) return null;

          return (
            <g key={tv}>
              <line
                x1={padL}
                y1={yy}
                x2={w - padR}
                y2={yy}
                stroke="#e5e7eb"
                strokeOpacity="0.7"
                strokeWidth="1"
              />
              <text
                x={padL - 7}
                y={yy + 4}
                textAnchor="end"
                fontSize={pdfMode ? "10" : "11"}
                fill="#64748b"
              >
                {Number(tv).toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={pdfMode ? "mt-1 text-[10px] leading-tight text-slate-500" : "mt-1 text-xs text-slate-500"}>
        Note: values are hourly kWh treated as average kW per hour step.
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}




function NextStepsPanel({ quote, onEmailQuote, onRequestCall, infoUrl, onDownloadPdf, initialName, initialEmail, initialPhone }) {
  const [name, setName] = useState(initialName || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [phone, setPhone] = useState(initialPhone || "");

  const [emailStatus, setEmailStatus] = useState("");
  const [callStatus, setCallStatus] = useState("");

  const [marketingConsent, setMarketingConsent] = useState(false);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setEmailStatus("Sending…");
    try {
      await onEmailQuote({ name, email, marketingConsent });
      setEmailStatus("✅ Sent! Please check your inbox (and spam/junk).");
    } catch (err) {
      setEmailStatus("❌ Something went wrong. Please try again.");
    }
  }

  async function handleCallSubmit(e) {
    e.preventDefault();
    setCallStatus("Sending…");
    try {
      await onRequestCall({ name, email, phone, marketingConsent });
      setCallStatus("✅ Thanks! We’ll be in touch soon. Check your inbox for your quote.");
    } catch (err) {
      setCallStatus("❌ Something went wrong. Please try again.");
    }
  }

  return (
    <section className="mt-10">
      <SectionHeader
        title="Next Steps"
        description="Choose what you’d like to do next. We can email your quote, arrange a call, or point you to useful guides."
        action={
          <button
            onClick={onDownloadPdf}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Download PDF Quote
          </button>
        }
      />
      {/* Badge row (subtle polish) */}
      <div className="mt-4 mb-8 flex items-center gap-2">
        <span className="rounded-full bg-accent px-3 py-2 text-xs font-medium text-white">
          Store Your Quote
        </span>
        <span className="rounded-full bg-accent px-3 py-2 text-xs font-medium text-white">
          Get you system installed
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Card 1: Email my quote */}
        <Card title="Email my quote">
          <p className="text-sm text-slate-600">
            Get a copy of your estimate by email. You’ll receive your quote summary and next steps.
          </p>

          <form className="mt-4 space-y-3" onSubmit={handleEmailSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-600">Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>

            <label className="flex items-start mt-4 gap-2 text-micro text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />
              <span>
                I’m happy to receive occasional emails about solar news, quote tool improvements
                and related guidance. <p>You can unsubscribe at any time.</p>
              </span>
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Email my quote
            </button>

            {emailStatus && <p className="text-xs text-slate-500">{emailStatus}</p>}
          </form>
        </Card>

        {/* Card 2: Talk to an installer */}
        <Card title="Talk to an installer">
          <p className="text-sm text-slate-600">
            Ask questions, confirm suitability, and take the next step. We’ll also email your quote for reference.
          </p>

          <form className="mt-4 space-y-3" onSubmit={handleCallSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-600">Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Phone</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07..."
                type="tel"
                required
              />
            </div>

            <label className="flex items-start mt-4 gap-2 text-micro text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />
              <span>
                I’m happy to receive occasional emails about solar news, quote tool improvements
                and related guidance. <p>You can unsubscribe at any time.</p>
              </span>
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Request a call
            </button>

            {callStatus && <p className="text-xs text-slate-500">{callStatus}</p>}
          </form>
        </Card>

        {/* Card 3: Learn more */}
        <Card title="Learn more about solar">
          <p className="text-sm text-slate-600">
            Read quick guides on solar, batteries, SEG payments, and how we estimate savings.
          </p>

          <div className="mt-4">
            <a href={infoUrl} className="block">
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Visit information centre
              </button>
            </a>

            <p className="mt-3 text-xs text-slate-500">
              Tip: Use this to build confidence before booking a call.
            </p>
          </div>
        </Card>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        This is an estimate, not a formal quote. Final design and pricing depends on a site survey and exact product choices.
      </p>

      <p className="mt-2 mb-6 text-xs text-slate-500">
        Self-consumption model:{" "}
        <strong className="text-slate-900">{quote?.selfConsumptionModel}</strong>
      </p>
    </section>
  );
}


function App() {
  const savedState = loadSavedState();
  const [progress, setProgress] = useState({ pct: 0, label: "Preparing your quote…" });
  const fakeTimerRef = useRef(null);
  const fakeStartRef = useRef(0);
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

  const EMPTY_DRAFT_ROOF = () => ({
    id: crypto.randomUUID(),
    orientation: "",
    tilt: null,
    shading: "",
    roofSize: "",
    panels: 0,
  });

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
   * PROGRESS BAR FAKE
   * =========================================================
   */
  function startFakeProgress(durationMs = 12000) {
    stopFakeProgress();
    fakeStartRef.current = Date.now();

    fakeTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - fakeStartRef.current;
      const t = Math.min(1, elapsed / durationMs);

      // Ease-out curve, ends around 92% (so it doesn’t hit 100 before quote arrives)
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = Math.round(92 * eased);

      setProgress((p) => ({
        ...p,
        pct: Math.max(p.pct, pct),
        label: pct < 35 ? "Fetching local solar data…" : pct < 75 ? "Simulating usage & battery…" : "Finalising your quote…",
      }));
    }, 250);
  }

  function stopFakeProgress() {
    if (fakeTimerRef.current) {
      clearInterval(fakeTimerRef.current);
      fakeTimerRef.current = null;
    }
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
      setProgress((p) => ({ ...p, pct: 100, label: "Quote ready!" }));

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
                        {roofModalOpen && (
                          <div className="modal-overlay" onClick={closeRoofModal}>
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

                                <button type="button" className="modal-close" onClick={closeRoofModal}>
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
                                      closeRoofModal();
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
                                      saveRoofFromDraft();
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
