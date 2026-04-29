import React from "react";

function SectionRows({ title, rows, pdfMode = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className={pdfMode ? "bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900" : "bg-slate-100 px-4 py-3 text-base font-semibold text-slate-900"}>
        {title}
      </div>

      <div className="divide-y divide-slate-200">
        {rows.map(([label, value, unit], idx) => (
          <div
            key={idx}
            className={pdfMode ? "grid grid-cols-[1.35fr_1.25fr_0.35fr] px-4 py-3 text-[11px]" : "grid grid-cols-[1.35fr_1.25fr_0.35fr] px-4 py-4 text-sm"}
          >
            <div className="pr-3 text-slate-900">{label}</div>
            <div className="pr-3 text-slate-900">{value}</div>
            <div className="text-slate-700">{unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function McsPerformanceTable({ data, pdfMode = false }) {
  if (!data) return null;

  return (
    <div className={pdfMode ? "mt-4 space-y-4" : "mt-6 space-y-5"}>
      <div>
        <div className={pdfMode ? "text-sm font-semibold uppercase tracking-wide text-accent" : "text-body font-semibold uppercase tracking-wide text-accent"}>
          MCS performance estimate
        </div>
        <div className={pdfMode ? "mt-1 text-xs text-slate-600" : "mt-1 text-sm text-slate-600"}>
          This appendix presents the key MIS-3002-style performance figures using your quote data and standardised presentation.
        </div>
      </div>

      <SectionRows title="A. Installation data" rows={data.sectionA} pdfMode={pdfMode} />
      <SectionRows title="B. Performance calculations" rows={data.sectionB} pdfMode={pdfMode} />
      <SectionRows title="C. Estimated PV self-consumption - PV Only" rows={data.sectionC} pdfMode={pdfMode} />
      {data.hasBattery && (
        <SectionRows 
          title="D. Estimated PV self-consumption - with EESS" 
          rows={data.sectionD} pdfMode={pdfMode} />
        )}
      {data.hasBattery && (
        <SectionRows 
        title="E. Additional benefits from PV and EESS" 
        rows={data.sectionE} pdfMode={pdfMode} />
      )}

      <p className={pdfMode ? "text-[10px] leading-snug text-slate-500" : "text-xs text-slate-500"}>
        Notes: This table is presented in an MIS-3002-style format using your proposal’s simulation data rather than raw MCS lookup-table outputs. Where supplier-specific or load-specific benefits are not explicitly modelled, values are shown conservatively.
      </p>
    </div>
  );
}