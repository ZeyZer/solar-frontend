import React from "react";

import { ACTIVE_BRAND, PLATFORM } from "../config/siteConfig";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-full rounded bg-slate-200 animate-pulse" />
        <div className="h-2.5 w-5/6 rounded bg-slate-200 animate-pulse" />
        <div className="h-2.5 w-2/3 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="mt-4 h-8 w-24 rounded-xl bg-accent/10 animate-pulse" />
    </div>
  );
}

export default function LoadingScreen({
  pct = 0,
  label = "Calculating your quote…",
  hint = "This usually takes around 10–15 seconds.",
}) {
  const brandName = ACTIVE_BRAND.name;
  const brandInitials =
    ACTIVE_BRAND.initials || brandName.slice(0, 2).toUpperCase();
  const brandLogo = ACTIVE_BRAND.assets?.logo || null;

  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-64 -left-24 h-[520px] w-[520px] rounded-full bg-gentle/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="rounded-3xl bg-white/80 backdrop-blur border border-slate-200 shadow-xl overflow-hidden">
          {/* Top accent */}
          <div className="h-2 bg-gradient-to-r from-accent via-gentle to-accent" />

          <div className="p-7 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
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
                  Powered by {PLATFORM.toolName}
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  {/* “Sun” mark */}
                  <div className="relative h-10 w-10 rounded-2xl bg-accent/10 border border-accent/15 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl animate-pulse bg-accent/10" />
                    <div className="relative h-4 w-4 rounded-full bg-accent" />
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
              <div className="h-3 rounded-full bg-soft overflow-hidden">
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
              Using PVGIS simulations. We’ll take you straight to your quote when it’s ready.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}