import React from "react";

export default function RoofInputModeSelector({ value, onChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold text-slate-900">Roof details</h3>

      <p className="mt-1 text-sm text-slate-600">
        Choose how you want to tell us about your roof.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("panel_count")}
          className={`rounded-xl border p-4 text-left ${
            value === "panel_count"
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="font-semibold text-slate-900">
            I know roughly how many panels fit
          </div>

          <div className="mt-1 text-sm text-slate-600">
            Fastest option. Best if you already know the likely panel count.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange("draw_my_roof")}
          className={`rounded-xl border p-4 text-left ${
            value === "draw_my_roof"
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="font-semibold text-slate-900">
            AI roof model
          </div>

          <div className="mt-1 text-sm text-slate-600">
            Select the building roofs on the map and we’ll use Google Solar API to estimate roof segments, pitch, azimuth and solar potential.
          </div>
        </button>
      </div>
    </div>
  );
}