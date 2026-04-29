import React from "react";
import McsPerformanceTable from "./McsPerformanceTable";

export default function McsPerformanceModal({ open, onClose, data }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <div className="text-base font-semibold text-slate-900">
              MCS performance estimate
            </div>
            <div className="mt-1 text-sm text-slate-600">
              MIS-3002-style installation and performance summary.
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
          <McsPerformanceTable data={data} />
        </div>
      </div>
    </div>
  );
}