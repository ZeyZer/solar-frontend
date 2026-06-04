import React from "react";

import {
  getTariffPreset,
} from "../config/tariffPresets";

export default function TariffModal({
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

  const applyTariffType = (nextTariffType) => {
    setDraftTariff((current) => {
      const preset = getTariffPreset(nextTariffType);

      return {
        ...preset,

        // Keep values the user commonly expects to remain stable.
        standingChargePerDay:
          current.standingChargePerDay ?? preset.standingChargePerDay,

        energyInflationRate:
          current.energyInflationRate ?? preset.energyInflationRate,

        // Keep custom SEG rate when editing after-solar tariff.
        segPrice:
          tariffEditMode === "after"
            ? current.segPrice ?? preset.segPrice
            : preset.segPrice,
      };
    });
  };

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
                onChange={(e) => applyTariffType(e.target.value)}
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
                  <label className="text-xs font-semibold text-slate-600">Off-peak import (00:00 - 06:00) (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.importOffPeak}
                    onChange={(e) => setField("importOffPeak", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Off-peak export (00:00 - 06:00) (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.exportOffPeak}
                    onChange={(e) => setField("exportOffPeak", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Peak import (16:00 - 19:00) (£/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftTariff.importPeak}
                    onChange={(e) => setField("importPeak", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Peak import (16:00 - 19:00) (£/kWh)</label>
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