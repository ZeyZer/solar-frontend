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
          <div className="font-semibold text-slate-900">I know roughly how many panels fit</div>
          <div className="mt-1 text-sm text-slate-600">
            Fastest option, but lowest roof-layout confidence.
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
          <div className="font-semibold text-slate-900">Draw my roof</div>
          <div className="mt-1 text-sm text-slate-600">
            Draw usable roof areas from aerial imagery for a better estimate.
          </div>
        </button>
      </div>
    </div>
  );
}