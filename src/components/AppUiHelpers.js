import React from "react";

// ---------- Confidence UI components (reusable) ----------

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function ConfidenceNote({ title = "Quick tip", children }) {
  return (
    <div className="confidence-note">
      <div className="confidence-note-title">✅ {title}</div>
      <div className="confidence-note-body">{children}</div>
    </div>
  );
}

function StepHeader({ title, subtitle, badge }) {
  return (
    <div className="step-header">
      <div>
        <h4 className="step-title">{title}</h4>
        {subtitle && <p className="step-subtitle">{subtitle}</p>}
      </div>
      {badge && <div className="step-badge">{badge}</div>}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function fmtHour(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return "00:00";
  const hh = ((Math.round(n) % 24) + 24) % 24; // safe wrap 0..23
  return String(hh).padStart(2, "0") + ":00";
}

function fmtWindow(startHour, endHour) {
  return `${fmtHour(startHour)} – ${fmtHour(endHour)}`;
}


export {
  Pill,
  ConfidenceNote,
  StepHeader,
  Row,
  fmtHour,
  fmtWindow,
};