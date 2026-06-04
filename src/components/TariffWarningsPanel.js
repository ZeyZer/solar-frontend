import React from "react";

function getSeverityClasses(severity) {
  if (severity === "caution") {
    return {
      card: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-800",
      title: "text-amber-950",
      text: "text-amber-800",
    };
  }

  return {
    card: "border-slate-200 bg-slate-50",
    badge: "bg-slate-100 text-slate-700",
    title: "text-slate-900",
    text: "text-slate-600",
  };
}

export default function TariffWarningsPanel({
  quote,
  open,
  onClose,
}) {
  const tariffWarnings = quote?.tariffWarnings;
  const warnings = Array.isArray(tariffWarnings?.warnings)
    ? tariffWarnings.warnings
    : [];

  if (!open || !warnings.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="h-2 bg-gradient-to-r from-emerald-600 to-teal-500" />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Tariff model notes
              </div>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                These notes explain how tariff assumptions are used in this beta estimate.
              </p>

              <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {tariffWarnings?.timeResolution || "hourly"} model
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

          <div className="mt-5 grid max-h-[65vh] grid-cols-1 gap-3 overflow-y-auto pr-1">
            {warnings.map((warning) => {
              const classes = getSeverityClasses(warning.severity);

              return (
                <div
                  key={warning.code || warning.title}
                  className={`rounded-2xl border p-4 ${classes.card}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes.badge}`}>
                      {warning.severity === "caution" ? "Caution" : "Info"}
                    </span>

                    <div>
                      <div className={`text-sm font-semibold ${classes.title}`}>
                        {warning.title}
                      </div>

                      <div className={`mt-1 text-sm leading-6 ${classes.text}`}>
                        {warning.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Close notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}