import React, { useEffect, useState } from "react";

import SectionHeader from "../ui/SectionHeader";
import Card from "../ui/Card";
import CardAlt from "../ui/CardAlt";
import CardAlt2 from "../ui/CardAlt2";
import ButtonLink from "../ui/ButtonLink";
import { Stat, StatGrid } from "../ui/Stat";
import QuoteHeader from "../ui/QuoteHeader";
import ConfigChoiceCard from "../ui/ProductTile";

import McsPerformanceTable from "./McsPerformanceTable";
import McsPerformanceModal from "./McsPerformanceModal";
import EnergyFlowCards from "./EnergyFlowCards";
import StickyQuoteNav from "./StickyQuoteNav";
import NextStepsPanel from "./NextStepsPanel";

import LegalNotice from "./LegalNotice";
import TariffWarningsPanel from "./TariffWarningsPanel";

import {
  FinanceDetailsModal,
  FinanceDetailsTable,
  MonthlySavingsModal,
} from "./FinancialModals";

import {
  StackedMonthlyBarChart,
  SolarUsageDonut,
  DailyUsageLineChart,
  TwoBarYearChart,
  CumulativePaybackBarChart,
  DayPowerChart,
} from "./QuoteCharts";

import {
  Row,
  fmtWindow,
} from "./AppUiHelpers";

import {
  calculateIRR,
  buildMonthlySavingsRows,
  toNumber,
} from "../utils/quoteFormatting";

import {
  getMcsTableData,
} from "../utils/mcsTableData";

import {
  humanPanelOption,
  PANEL_UI,
  BATTERY_UI,
  EV_UI,
  BIRD_UI,
} from "../utils/productDisplayUtils";

import {
  recalculateQuote,
  emailQuoteLead,
  requestCallLead,
} from "../api/quoteApi";

//===================\\
// CREATE QUOTE PAGE \\
//===================\\

export default function QuotePage({
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

  // Tariff Warnings
  const [tariffWarningsOpen, setTariffWarningsOpen] = useState(false);

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

  const mode = pdfMode ? "pdf" : "screen";
  const isMode = (value) => mode === value;
  const isPdf = isMode("pdf");
  const quoteContainerClass = isPdf ? "quote-container pdf-tight-top" : "quote-container";
  const quoteContentClass = isPdf
    ? "quote-content quote-content--clean pdf-tight-top"
    : "quote-content quote-content--clean";


  // EXIT TO HOME BUTTON
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  const exitToWebsite = () => {
    setExitConfirmOpen(true);
  };

  function confirmExitToWebsite() {
    setExitConfirmOpen(false);
    onBackToForm?.();
  } 
  
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

  // === ENVIRONMENT ICONS ==== \\
  function EnvironmentalImpactIcon({ src }) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={pdfMode ? "mx-auto h-7 w-7 object-contain" : "mx-auto h-12 w-12 object-contain"}
      />
    );
  }

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

  const calculationAssumptions = quote?.calculationAssumptions || null;
  const selectedPanelOption = calculationAssumptions?.selectedPanelOption || null;
  const roofFitAssumption = calculationAssumptions?.roofFitAssumption || null;
  const performanceModel = calculationAssumptions?.performanceModel || null;

  const roofFitPanelAssumption =
    Array.isArray(roofFitAssumption?.panelAssumptions) &&
    roofFitAssumption.panelAssumptions.length > 0
      ? roofFitAssumption.panelAssumptions[0]
      : null;

  const selectedPanelLabel =
    selectedPanelOption?.label ||
    humanPanelOption(form?.panelOption || quote?.panelOption || "value");

  const selectedPanelWatt =
    selectedPanelOption?.panelWatt ||
    quote?.panelWatt ||
    null;

  const roofFitLabel = roofFitAssumption?.aiRoofDataUsed
    ? "AI roof model"
    : "Roof card estimate";

  const performanceSourceLabel =
    Array.isArray(performanceModel?.pvgisInputSources) &&
    performanceModel.pvgisInputSources.includes("ai_roof_data")
      ? "PVGIS using AI roof angles"
      : "PVGIS using roof inputs";

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

  const tb = quote?.tariffBefore || null;
  const ta = quote?.tariffAfter || null;

  return (
    <div className="quote-shell quote-shell--clean">
      
      {!isPdf && exitConfirmOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-quote-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 id="exit-quote-title" className="text-xl font-semibold text-slate-900">
              Leave your quote?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will clear your current estimate and take you back to Zeyzer Solar.
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              If you want to keep this quote, please email yourself a copy before leaving.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Stay on quote
              </button>

              <button
                type="button"
                onClick={confirmExitToWebsite}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Leave and clear quote
              </button>
            </div>
          </div>
        </div>
      )}

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
                      src="/images/solar-home.png"
                      alt="Solar panels on a residential home"
                      className="h-[200px] w-full object-cover sm:h-[240px] lg:h-[350px]"
                    />
                    {/* subtle fade for polish */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                  </div>
                </div>
              </div>
              <LegalNotice
                variant="compact"
                className="mt-2"
              />
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

              {!isPdf && calculationAssumptions && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">
                    How this estimate was calculated
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Selected panel option
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {selectedPanelLabel}
                        {selectedPanelWatt ? ` · ${selectedPanelWatt}W` : ""}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Used for system size, pricing and generation output.
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Roof fit estimate
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {roofFitLabel}
                        {totalPanels ? ` · ${totalPanels} panels` : ""}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {roofFitPanelAssumption?.widthMm && roofFitPanelAssumption?.heightMm
                          ? `Panel fit based on approx. ${roofFitPanelAssumption.widthMm} × ${roofFitPanelAssumption.heightMm}mm module footprint.`
                          : "Panel count is based on the roof information supplied."}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Performance model
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {performanceSourceLabel}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {performanceModel?.annualGenerationKWh
                          ? `${Math.round(performanceModel.annualGenerationKWh).toLocaleString()} kWh estimated annual generation.`
                          : "Estimated annual generation calculated from the quote model."}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    The roof-fit model estimates how many same-footprint panels can fit. Your selected panel option controls the wattage used for this quote.
                  </p>
                </div>
              )}
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
                    src="/images/solar-home.png"
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
                      <EnvironmentalImpactIcon src="/icons/environment/earth.png" />
                      <div className={pdfMode ? "mt-1 text-xl font-medium text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {lifetimeCO2.toLocaleString()} kg
                      </div>
                      <div className="mt-1 text-xs text-slate-500">CO₂ avoided</div>
                    </div>

                    <div className="text-center">
                      <EnvironmentalImpactIcon src="/icons/environment/car.png" />
                      <div className={pdfMode ? "mt-1 text-xl font-medium text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {kmEquivalent.toLocaleString()}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Car km avoided</div>
                    </div>

                    <div className="text-center">
                      <EnvironmentalImpactIcon src="/icons/environment/plane.png" />
                      <div className={pdfMode ? "mt-1 text-xl font-medium text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                        {flightsEquivalent}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">long-haul <p>flights avoided</p></div>
                    </div>

                    <div className="text-center">
                      <EnvironmentalImpactIcon src="/icons/environment/tree.png" />
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
            <div className={pdfMode ? "mt-3 pdf-system-preferences-section pdf-keep-together" : "mt-7"}>
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
                        
                        {!pdfMode && quote?.tariffWarnings?.warnings?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setTariffWarningsOpen(true)}
                            className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View tariff model notes
                          </button>
                        )}
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
                    Knowing which battery capacity you need is difficult! So we compare your selected battery
                    against a no-battery option, then show two recommended battery sizes based on a comparison
                    period of{" "}
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

                {quote?.batteryRecommendations?.noBatteryComparison && (() => {
                  const comparison = quote.batteryRecommendations.noBatteryComparison;
                  const noBattery = comparison.noBattery || {};
                  const selectedBattery = comparison.selectedBattery || {};
                  const incremental = comparison.incremental || {};
                  const verdict = comparison.verdict || {};

                  const selectedBatteryLabel =
                    selectedBattery.requestedBatteryKWhUsable ||
                    selectedBattery.batteryKWhUsable ||
                    form?.batteryKWh ||
                    quote?.hourlyModel?._batteryKWh ||
                    0;

                  const extraAnnualBenefit = Number(incremental.annualBenefit || 0);
                  const extraLifetimeSavings = Number(incremental.lifetimeNetSavings || 0);
                  const estimatedBatteryCost = Number(incremental.estimatedBatteryCost || incremental.systemCost || 0);
                  const batteryPaybackYears = incremental.batteryPaybackYears;

                  return (
                    <div className={pdfMode ? "mt-3 rounded-2xl border border-slate-200 bg-white p-3 pdf-keep-together" : "mt-5 rounded-3xl border border-slate-200 bg-white p-5"}>
                      <div className={pdfMode ? "text-xs font-semibold uppercase tracking-wide text-accent" : "text-sm font-semibold uppercase tracking-wide text-accent"}>
                        Battery vs no battery
                      </div>

                      <p className={pdfMode ? "mt-1 text-xs leading-snug text-slate-600" : "mt-2 text-sm leading-6 text-slate-600"}>
                        This compares your selected battery size against the same solar system with no battery.
                      </p>

                      <div className={pdfMode ? "mt-3 grid grid-cols-3 gap-2" : "mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"}>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                          <div className={pdfMode ? "text-[10px] font-medium text-slate-500" : "text-s font-medium text-slate-500"}>
                            No battery annual benefit
                          </div>
                          <div className={pdfMode ? "mt-1 text-lg font-semibold text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                            £{Number(noBattery.annualBenefit || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                          <div className={pdfMode ? "text-[10px] font-medium text-slate-500" : "text-s font-medium text-slate-500"}>
                            {selectedBatteryLabel} kWh battery benefit
                          </div>
                          <div className={pdfMode ? "mt-1 text-lg font-semibold text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
                            £{Number(selectedBattery.annualBenefit || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-accent/25 bg-white p-3 text-center">
                          <div className={pdfMode ? "text-[10px] font-medium text-slate-500" : "text-s font-medium text-slate-500"}>
                            Extra annual benefit
                          </div>
                          <div className={pdfMode ? "mt-1 text-lg font-semibold text-accent" : "mt-1 text-2xl font-semibold text-accent"}>
                            {extraAnnualBenefit >= 0 ? "+" : "-"}£{Math.abs(extraAnnualBenefit).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className={pdfMode ? "mt-3 grid grid-cols-3 gap-2 text-center" : "mt-4 grid grid-cols-1 gap-3 text-center md:grid-cols-3"}>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className={pdfMode ? "text-[10px] text-slate-500" : "text-xs text-slate-500"}>
                            Estimated extra system cost
                          </div>
                          <div className={pdfMode ? "mt-1 text-sm font-semibold text-slate-900" : "mt-1 text-base font-semibold text-slate-900"}>
                            £{estimatedBatteryCost.toLocaleString()}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className={pdfMode ? "text-[10px] text-slate-500" : "text-xs text-slate-500"}>
                            Battery-only payback
                          </div>
                          <div className={pdfMode ? "mt-1 text-sm font-semibold text-slate-900" : "mt-1 text-base font-semibold text-slate-900"}>
                            {batteryPaybackYears ? `${batteryPaybackYears} yrs` : "N/A"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className={pdfMode ? "text-[10px] text-slate-500" : "text-xs text-slate-500"}>
                            Extra lifetime net savings
                          </div>
                          <div className={pdfMode ? "mt-1 text-sm font-semibold text-slate-900" : "mt-1 text-base font-semibold text-slate-900"}>
                            {extraLifetimeSavings >= 0 ? "+" : "-"}£{Math.abs(extraLifetimeSavings).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className={pdfMode ? "mt-3 rounded-2xl bg-white p-3 text-xs leading-snug text-slate-600" : "mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600"}>
                        {verdict.batteryAddsAnnualValue ? (
                          <>
                            Based on the current assumptions, the selected battery adds extra annual value compared with no battery.
                          </>
                        ) : (
                          <>
                            Based on the current assumptions, the selected battery does not add extra annual value compared with no battery.
                          </>
                        )}{" "}
                        This is still based on the current abstract pricing model. Real product pricing will be improved when the hardware database is added.
                      </div>
                    </div>
                  );
                })()}

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
              infoUrl="https://zeyzersolar.com/solar-advice-hub/"
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
      <TariffWarningsPanel
        quote={quote}
        open={tariffWarningsOpen}
        onClose={() => setTariffWarningsOpen(false)}
      />
    </div>
  );
}
