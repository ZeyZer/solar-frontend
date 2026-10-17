import React from "react";

function SectionRows({ title, rows, pdfMode = false, compactPdf = false }) {
  const useCompactPdf = pdfMode && compactPdf;
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${useCompactPdf ? "pdf-mcs-section" : ""}`}>
      <div className={useCompactPdf ? "bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900" : pdfMode ? "bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900" : "bg-slate-100 px-4 py-3 text-base font-semibold text-slate-900"}>
        {title}
      </div>

      <div className="divide-y divide-slate-200">
        {rows.map(([label, value, unit], idx) => (
          <div
            key={idx}
            className={useCompactPdf ? "grid grid-cols-[1.35fr_1.25fr_0.35fr] px-4 py-2 text-[11px]" : pdfMode ? "grid grid-cols-[1.35fr_1.25fr_0.35fr] px-4 py-3 text-[11px]" : "grid grid-cols-[1.35fr_1.25fr_0.35fr] px-4 py-4 text-sm"}
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

export default function McsPerformanceTable({ data, pdfMode = false, compactPdf = false }) {
  if (!data) return null;
  const useCompactPdf = pdfMode && compactPdf;

  return (
    <div className={useCompactPdf ? "pdf-mcs-performance mt-3 space-y-2" : pdfMode ? "mt-4 space-y-4" : "mt-6 space-y-5"}>
      <div>
        <div className={pdfMode ? "text-sm font-semibold uppercase tracking-wide text-accent" : "text-body font-semibold uppercase tracking-wide text-accent"}>
          MCS performance estimate
        </div>
        <div className={pdfMode ? "mt-1 text-xs text-slate-600" : "mt-1 text-sm text-slate-600"}>
          This appendix presents the key MIS-3002-style performance figures using your quote data and standardised presentation.
        </div>
      </div>

      <SectionRows title="A. Installation data" rows={data.sectionA} pdfMode={pdfMode} compactPdf={compactPdf} />
      <SectionRows title="B. Performance calculations" rows={data.sectionB} pdfMode={pdfMode} compactPdf={compactPdf} />
      <SectionRows title="C. Estimated PV self-consumption - PV Only" rows={data.sectionC} pdfMode={pdfMode} compactPdf={compactPdf} />
      <div className={useCompactPdf ? "pdf-mcs-eess-group space-y-2" : pdfMode ? "space-y-4" : "space-y-5"}>
        {data.hasBattery && (
          <SectionRows
            title="D. Estimated PV self-consumption - with EESS"
            rows={data.sectionD} pdfMode={pdfMode} compactPdf={compactPdf} />
          )}
        {data.hasBattery && (
          <SectionRows
            title="E. Additional benefits from PV and EESS"
            rows={data.sectionE} pdfMode={pdfMode} compactPdf={compactPdf} />
        )}

        <p className={pdfMode ? "text-[10px] leading-snug text-slate-500" : "text-xs text-slate-500"}>
          Notes: This table is presented in an MIS-3002-style format using your proposal’s simulation data rather than raw MCS lookup-table outputs. Where supplier-specific or load-specific benefits are not explicitly modelled, values are shown conservatively.
        </p>
      </div>
    </div>
  );
}
