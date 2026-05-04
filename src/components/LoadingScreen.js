import React from "react";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-full rounded bg-slate-200 animate-pulse" />
        <div className="h-2.5 w-5/6 rounded bg-slate-200 animate-pulse" />
        <div className="h-2.5 w-2/3 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="mt-4 h-8 w-24 rounded-xl bg-emerald-100 animate-pulse" />
    </div>
  );
}

export default function LoadingScreen({
  pct = 0,
  label = "Calculating your quote…",
  hint = "This usually takes around 10–15 seconds.",
}) {
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-64 -left-24 h-[520px] w-[520px] rounded-full bg-teal-200/50 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="rounded-3xl bg-white/80 backdrop-blur border border-slate-200 shadow-xl overflow-hidden">
          {/* Top accent */}
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

          <div className="p-7 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  {/* “Sun” mark */}
                  <div className="relative h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl animate-pulse bg-emerald-200/40" />
                    <div className="relative h-4 w-4 rounded-full bg-emerald-600" />
                  </div>

                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      {label}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {hint}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums text-slate-900">
                  {Math.round(clamped)}%
                </div>
                <div className="text-xs text-slate-500">Working…</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-3 rounded-full bg-teal-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-muted transition-all duration-500 ease-out"
                  style={{ width: `${clamped}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Solar modelling</span>
                <span>Savings & payback</span>
                <span>Quote build</span>
              </div>
            </div>

            {/* “Preview” skeleton cards to match SaaS feel */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>

            {/* Microcopy */}
            <div className="mt-6 text-xs text-slate-500">
              Powered by :PVGIS simulations. We’ll take you straight to your quote when it’s ready.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}