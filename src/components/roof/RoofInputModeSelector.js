import React from "react";

export default function RoofInputModeSelector({ value, onChange }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-lg font-semibold text-ink">Roof details</h3>

      <p className="mt-1 text-sm text-muted">
        Choose how you want to tell us about your roof.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("panel_count")}
          className={`rounded-xl border p-4 text-left ${
            value === "panel_count"
              ? "border-accent bg-brandSoft ring-1 ring-accent/20"
              : "border-line bg-surface hover:border-subtle hover:bg-soft"
          }`}
        >
          <div className="font-semibold text-ink">
            I know roughly how many panels fit
          </div>

          <div className="mt-1 text-sm text-muted">
            Fastest option. Best if you already know the likely panel count.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange("draw_my_roof")}
          className={`rounded-xl border p-4 text-left ${
            value === "draw_my_roof"
              ? "border-accent bg-brandSoft ring-1 ring-accent/20"
              : "border-line bg-surface hover:border-subtle hover:bg-soft"
          }`}
        >
          <div className="font-semibold text-ink">
            AI roof model
          </div>

          <div className="mt-1 text-sm text-muted">
            Select the building roofs on the map and we’ll use Google Solar API to estimate roof segments, pitch, azimuth and solar potential.
          </div>
        </button>
      </div>
    </div>
  );
}
