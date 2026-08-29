import React from "react";

function StackedMonthlyBarChart({ title, labels, series, pdfMode = false }) {
  // series = [{ name, data, className }]
  // data arrays must be length 12

  const totals = labels.map((_, i) =>
    series.reduce((sum, s) => sum + Number(s.data[i] || 0), 0)
  );

  const maxTotal = Math.max(...totals, 1);

  return (
    <div className="chart-card stacked-chart">
      <div className="chart-head">
        <h4 className="chart-title">{title}</h4>
        <div className="chart-legend">
          {series.map((s) => (
            <div key={s.name} className="legend-item">
              <span className={`legend-swatch ${s.className}`} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-bars">
        {labels.map((label, i) => {
          let stackedSoFar = 0;

          return (
            <div key={label} className="chart-col">
              <div className="chart-stack">
                {series.map((s) => {
                  const val = Number(s.data[i] || 0);
                  const heightPct = (val / maxTotal) * 100;
                  const bottomPct = (stackedSoFar / maxTotal) * 100;
                  stackedSoFar += val;

                  return (
                    <div
                      key={s.name}
                      className={`chart-seg ${s.className}`}
                      style={{ height: `${heightPct}%`, bottom: `${bottomPct}%` }}
                      title={`${label} • ${s.name}: ${Math.round(val).toLocaleString()} kWh`}
                    />
                  );
                })}
              </div>
              <div className="chart-label">{label}</div>
            </div>
          );
        })}
      </div>

      <p className="small-print">
        Hover a bar segment to see the exact monthly kWh.
      </p>
    </div>
  );
}

function SolarUsageDonut({ direct, battery, grid, pdfMode = false }) {
  const total = direct + battery + grid || 1;

  const dPct = (direct / total) * 100;
  const bPct = (battery / total) * 100;
  const gPct = (grid / total) * 100;

  const r = 42;
  const c = 2 * Math.PI * r;

  const dArc = (dPct / 100) * c;
  const bArc = (bPct / 100) * c;
  const gArc = (gPct / 100) * c;

  const svgSize = pdfMode ? 160 : 190;
  const outerClass = pdfMode
    ? "flex flex-row items-center justify-center gap-4 w-full"
    : "flex flex-col items-center justify-center";

  const legendWrapClass = pdfMode
    ? "grid w-auto grid-cols-1 gap-2 text-xs"
    : "mt-4 grid w-full max-w-[320px] grid-cols-3 gap-2 text-sm";

  const legendItemClass = pdfMode
    ? "flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"
    : "flex flex-col items-center rounded-xl bg-slate-50 gap-1 px-7 py-3";

  const labelClass = pdfMode
    ? "text-xs text-slate-700"
    : "text-body text-center text-slate-700";

  const valueClass = pdfMode
    ? "ml-auto text-sm font-semibold text-slate-900"
    : "text-stat font-semibold text-slate-900";

  return (
    <div
      className={outerClass}
      style={pdfMode ? { boxShadow: "none", filter: "none" } : undefined}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 100 100"
        className="overflow-visible shrink-0"
      >
        <g transform="rotate(-90 50 50)">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={pdfMode ? "9" : "10"}
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#facc15"
            strokeWidth={pdfMode ? "9" : "10"}
            strokeDasharray={`${dArc} ${c}`}
            strokeDashoffset="0"
            strokeLinecap="butt"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#2563eb"
            strokeWidth={pdfMode ? "9" : "10"}
            strokeDasharray={`${bArc} ${c}`}
            strokeDashoffset={-dArc}
            strokeLinecap="butt"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={pdfMode ? "9" : "10"}
            strokeDasharray={`${gArc} ${c}`}
            strokeDashoffset={-(dArc + bArc)}
            strokeLinecap="butt"
          />
        </g>

        <text
          x="50"
          y="46"
          textAnchor="middle"
          fontSize={pdfMode ? "5.5" : "6"}
          fill="#64748b"
        >
          Home energy
        </text>
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize={pdfMode ? "7" : "8"}
          fontWeight="600"
          fill="#0f172a"
        >
          100%
        </text>
      </svg>

      <div className={legendWrapClass}>
        <div className={legendItemClass}>
          <span className="h-3 w-3 rounded-full bg-amber-400 shrink-0" />
          <span className={labelClass}>Solar Direct</span>
          <span className={valueClass}>{dPct.toFixed(0)}%</span>
        </div>

        <div className={legendItemClass}>
          <span className="h-3 w-3 rounded-full bg-indigo-500 shrink-0" />
          <span className={labelClass}>Via Battery</span>
          <span className={valueClass}>{bPct.toFixed(0)}%</span>
        </div>

        <div className={legendItemClass}>
          <span className="h-3 w-3 rounded-full bg-slate-300 shrink-0" />
          <span className={labelClass}>Grid Direct</span>
          <span className={valueClass}>{gPct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function DailyUsageLineChart({ profile, pdfMode = false }) {
  if (!profile?.labels?.length || !profile?.kWh?.length) return null;

  const labels = profile.labels;   // 24 labels
  const data = profile.kWh;        // 24 kWh values
  const yMax = profile.yMax ?? Math.ceil(Math.max(...data, 0) + 1);

  // Use a "real" coordinate system with padding to prevent clipping
  const W = pdfMode ? 650 : 320;
  const H = pdfMode ? 150 : 110;

  const PAD_L = pdfMode ? 44 : 44;   // y-axis labels space
  const PAD_R = pdfMode ? 6 : 12;
  const PAD_T = 1;                  // top padding prevents clipping at the top
  const PAD_B = pdfMode ? 8 : 8;    // x-axis labels space
   

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const x = (i) => PAD_L + (i / (data.length - 1)) * plotW;
  const y = (v) => PAD_T + (1 - (v / yMax)) * plotH;

  const linePath = data
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
    .join(" ");

  const areaPath = `
    M ${PAD_L} ${PAD_T + plotH}
    ${data.map((v, i) => `L ${x(i)} ${y(v)}`).join(" ")}
    L ${PAD_L + plotW} ${PAD_T + plotH}
    Z
  `;
 
  // Y ticks 5 equally spaced guide bars: 0%, 25%, 50%, 75%, 100% of yMax
  const ticks = Array.from({ length: 6 }, (_, i) => {
    const value = (yMax * i) / 5;
    const label = value.toFixed(1);
    return { value, label };
  });

  return (
    <div className={pdfMode ? "chart-card daily-usage-chart pdf-usage-chart" : "chart-card daily-usage-chart"}>
      <div className="chart-head">
        <h4 className="chart-title">Typical daily energy usage</h4>

        {/* Key styled like StackedMonthlyBarChart */}
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-swatch legend-swatch--line" />
            <span>Demand</span>
          </div>
        </div>
      </div>
      <svg className="daily-usage-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Y grid + labels */}
        {ticks.map((t) => {
          const ty = y(t.value);
          return (
            <g key={t.value}>
              <line
                x1={PAD_L}
                y1={ty}
                x2={PAD_L + plotW}
                y2={ty}
                stroke="rgba(0,0,0,0.08)"
                strokeWidth="1"
              />
              <text
                x={PAD_L - 8}
                y={ty}
                fontSize={pdfMode ? "9" : "8"}
                textAnchor="end"
                dominantBaseline="middle"
                fill="rgba(0,0,0,0.65)"
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {/* Y axis title */}
        <text
          x={14}
          y={PAD_T + plotH / 2}
          fontSize={pdfMode ? "9" : "8"}
          fill="rgba(0,0,0,0.65)"
          transform={`rotate(-90 14 ${PAD_T + plotH / 2})`}
          textAnchor="middle"
        >
          kWh demand
        </text>

        {/* Filled area */}
        <path d={areaPath} fill="rgba(37, 99, 235, 0.15)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#233dff" strokeWidth="2" />

        {/* X labels every 4th hour */}
        {labels.map((lab, i) => {
          if (i % 4 !== 0) return null; // 00:00, 04:00, 08:00...
          return (
            <text
              key={lab}
              x={x(i)}
              y={PAD_T + plotH + 16}
              fontSize={pdfMode ? "9" : "8"}
              textAnchor="middle"
              fill="rgba(0,0,0,0.65)"
            >
              {lab}
            </text>
          );
        })}
      </svg>
    </div>
  );
}


function TwoBarYearChart({ title, leftLabel, leftValue, rightLabel, rightValue, valuePrefix = "", pdfMode = false }) {
    const chartHeightPx = pdfMode ? 110 : 160;
  const maxVal = Math.max(1, Number(leftValue || 0), Number(rightValue || 0));

  const leftH = Math.max(2, (Number(leftValue || 0) / maxVal) * chartHeightPx);
  const rightH = Math.max(2, (Number(rightValue || 0) / maxVal) * chartHeightPx);

  return (
    <div className={pdfMode ? "chart-card pdf-two-bar-chart" : "chart-card"}>
      <div className="chart-head">
        <h4 className="chart-title">{title}</h4>
      </div>

      <div
        className="year2bar-wrap"
        style={{ height: `${chartHeightPx + (pdfMode ? 48 : 70)}px` }}
      >
        <div className="year2bar-col">
          <div
            className="year2bar-bar bill-before"
            style={{ height: `${leftH}px` }}
            title={`${leftLabel}: ${valuePrefix}${Math.round(leftValue).toLocaleString()}`}
          />
          <div className={pdfMode ? "year2bar-label pdf-year2bar-label" : "year2bar-label"}>
            {leftLabel}
          </div>
          <div className={pdfMode ? "year2bar-value pdf-year2bar-value" : "year2bar-value"}>
            {valuePrefix}{Math.round(leftValue).toLocaleString()}
          </div>
        </div>

        <div className="year2bar-col">
          <div
            className="year2bar-bar bill-after"
            style={{ height: `${rightH}px` }}
            title={`${rightLabel}: ${valuePrefix}${Math.round(rightValue).toLocaleString()}`}
          />
          <div className={pdfMode ? "year2bar-label pdf-year2bar-label" : "year2bar-label"}>
            {rightLabel}
          </div>
          <div className={pdfMode ? "year2bar-value pdf-year2bar-value" : "year2bar-value"}>
            {valuePrefix}{Math.round(rightValue).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function CumulativePaybackBarChart({
  title,
  labels,
  cumulativeSavings,
  systemCost,
  paybackYear,
  valuePrefix = "£",
  footerRight = null,
  caption,
  xAxisLabel,
}) {
  const maxVal = Math.max(1, Number(systemCost || 0), ...(cumulativeSavings || []).map(v => Number(v || 0)));

  return (
    <div className="chart-card payback-chart">
      <div className="chart-head">
        <h4 className="chart-title">{title}</h4>
        {footerRight ? <div className="chart-right">{footerRight}</div> : null}
      </div>

      <div className="chart-bars">
        {(labels || []).map((lab, i) => {
          const val = Number(cumulativeSavings?.[i] || 0);
          const h = (val / maxVal) * 100;

          const reached = systemCost != null && val >= systemCost;
          const isPayback = paybackYear != null && i === paybackYear;

          return (
            <div key={lab} className="chart-col">
              <div
                className={`chart-stack ${reached ? "payback-reached" : ""} ${isPayback ? "payback-hit" : ""}`}
                title={`Year ${lab}: ${valuePrefix}${Math.round(val).toLocaleString()}`}
              >
                <div className="chart-seg payback-bar" style={{ height: `${h}%`, bottom: 0 }} />
                {/* cost marker */}
                {systemCost != null && (
                  <div
                    className="cost-marker"
                    style={{ bottom: `${(Number(systemCost) / maxVal) * 100}%` }}
                    title={`System cost: ${valuePrefix}${Math.round(systemCost).toLocaleString()}`}
                  />
                )}
              </div>

              <div className="chart-label">{lab}</div>
            </div>
          );
        })}
      </div>

      {/* ✅ NEW: X-axis label */}
      {xAxisLabel && (
        <div className="mt-3 text-center text-xs font-medium text-slate-500">
          {xAxisLabel}
        </div>
      )}

      {caption ? (
              <div className="mt-1 border-t border-slate-100 pt-3 pl-2 pr-2">
                {caption}
              </div>
            ) : null}
  </div>
  );
}

function DayPowerChart({ title, day, pdfMode = false }) {
  if (!day || !Array.isArray(day.hours) || day.hours.length < 2) return null;

  const hours = day.hours;
  const pv = (day.pv || []).map(Number);
  const load = (day.load || []).map(Number);

  const exportKWh = (day.exportKWh || []).map(Number);
  const chPV = (day.battChargeFromPVKWh || []).map(Number);
  const chGrid = (day.battChargeFromGridKWh || []).map(Number);
  const disLoad = (day.battDischargeToLoadKWh || []).map(Number);
  const disExp = (day.battDischargeToExportKWh || []).map(Number);

  const n = Math.min(
    hours.length,
    pv.length || hours.length,
    load.length || hours.length
  );

  const safe = (arr) => Array.from({ length: n }, (_, i) => Number(arr?.[i] || 0));

  const PV = safe(pv);
  const LOAD = safe(load).map((v) => -Math.max(0, v));
  const EXPORT = safe(exportKWh);

  const BATT = Array.from({ length: n }, (_, i) => {
    const discharge = (Number(disLoad[i] || 0) + Number(disExp[i] || 0));
    const charge = (Number(chPV[i] || 0) + Number(chGrid[i] || 0));
    return discharge - charge;
  });

  const NET = Array.from({ length: n }, (_, i) => ((PV[i] + BATT[i]) + LOAD[i]));
  const EXPORT_NEG = safe(exportKWh).map((v) => -Math.max(0, v));

  const all = [0, ...PV, ...LOAD, ...NET, ...EXPORT_NEG, ...BATT];
  let minV = Math.min(...all);
  let maxV = Math.max(...all);

  const padPct = 0.12;
  const span = (maxV - minV) || 1;
  minV = minV - span * padPct;
  maxV = maxV + span * padPct;

  const w = pdfMode ? 660 : 760;
  const h = pdfMode ? 190 : 260;
  const padL = pdfMode ? 32 : 42;
  const padR = pdfMode ? 12 : 18;
  const padT = pdfMode ? 10 : 18;
  const padB = pdfMode ? 24 : 34;

  const x = (i) =>
    padL + (i * (w - padL - padR)) / Math.max(1, n - 1);

  const y = (v) =>
    padT + (h - padT - padB) * (1 - (v - minV) / (maxV - minV || 1));

  const y0 = y(0);

  const tickHours = [4, 8, 12, 16, 20];
  const hourLabel = (h) => {
    if (h === 12) return "12pm";
    if (h === 0) return "12am";
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
  };

  function niceStep(rawStep) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const frac = rawStep / pow;

    let niceFrac = 1;
    if (frac <= 1) niceFrac = 1;
    else if (frac <= 2) niceFrac = 2;
    else if (frac <= 2.5) niceFrac = 2.5;
    else if (frac <= 5) niceFrac = 5;
    else niceFrac = 10;

    return niceFrac * pow;
  }

  function buildYTicks(minVal, maxVal, tickCount = 6) {
    const span = Math.max(1e-9, maxVal - minVal);
    const step = niceStep(span / (tickCount - 1));
    const niceMin = Math.floor(minVal / step) * step;
    const niceMax = Math.ceil(maxVal / step) * step;

    const ticks = [];
    for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
      ticks.push(Number(v.toFixed(6)));
    }
    return ticks;
  }

  const yTicks = buildYTicks(minV, maxV, 6);

  function smoothPath(arr, tension = 0.16) {
    const pts = arr.map((v, i) => ({ x: x(i), y: y(v), v }));
    if (pts.length < 2) return "";

    if (pts.length === 2) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    }

    const t = tension;
    let d = `M ${pts[0].x} ${pts[0].y}`;

    const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      let c1x = p1.x + (p2.x - p0.x) * t;
      let c1y = p1.y + (p2.y - p0.y) * t;
      let c2x = p2.x - (p3.x - p1.x) * t;
      let c2y = p2.y - (p3.y - p1.y) * t;

      const yMin = Math.min(p1.y, p2.y);
      const yMax = Math.max(p1.y, p2.y);

      c1y = clamp(c1y, yMin, yMax);
      c2y = clamp(c2y, yMin, yMax);

      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }

    return d;
  }

  function smoothAreaToZero(arr, tension = 0.16) {
    const top = smoothPath(arr, tension);
    if (!top) return "";
    return `${top} L ${x(n - 1)} ${y0} L ${x(0)} ${y0} Z`;
  }

  return (
    <div className={pdfMode ? "rounded-2xl bg-white p-1" : "rounded-2xl bg-white p-2"}>
      <div className={pdfMode ? "flex justify-center text-center text-sm font-semibold text-slate-900" : "flex justify-center text-body font-semibold text-slate-900"}>
        {title}
      </div>

      <div className={pdfMode ? "flex justify-center mb-3 mt-0 flex-wrap gap-3 text-[11px] text-slate-700" : "flex justify-center mb-6 mt-0 flex flex-wrap gap-4 text-xs text-slate-700"}>
        <LegendDot color="#000000" label="Home demand" />
        <LegendDot color="#facc15" label="Generation" />
        <LegendDot color="#94a3b8" label="Net consumption" />
        <LegendDot color="#dc2626" label="Export" />
        <LegendDot color="#2563eb" label="Battery" />
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className={pdfMode ? "mt-1 w-full" : "mt-3 w-full"}>
        <line x1={padL} y1={y0} x2={w - padR} y2={y0} stroke="#cbd5e1" strokeWidth="1" />

        <path d={smoothAreaToZero(PV, 0.18)} fill="rgba(250, 204, 21, 0.50)" stroke="none" />
        <path d={smoothAreaToZero(NET, 0.18)} fill="rgba(148, 163, 184, 0.30)" stroke="none" />
        <path d={smoothAreaToZero(EXPORT, 0.18)} fill="rgba(220, 38, 38, 1)" stroke="none" />
        <path d={smoothAreaToZero(BATT, 0.18)} fill="rgba(37, 99, 235, 0.25)" stroke="none" />

        <path d={smoothPath(PV, 0.18)} fill="none" stroke="rgba(250, 204, 21, 0.50)" strokeWidth="0" />
        <path d={smoothPath(NET, 0.18)} fill="none" stroke="rgba(148, 163, 184, 0.30" strokeWidth="1" />
        <path d={smoothPath(EXPORT, 0.18)} fill="none" stroke="#dc2626" strokeWidth="0" />
        <path d={smoothPath(BATT, 0.18)} fill="none" stroke="rgba(37, 99, 235, 0.25)" strokeWidth="1" />
        <path d={smoothPath(LOAD, 0.18)} fill="none" stroke="#000000" strokeWidth={pdfMode ? "2" : "2.5"} />

        {tickHours.map((th) => {
          const i = Math.min(n - 1, Math.max(0, th));
          return (
            <g key={th}>
              <line
                x1={x(i)}
                y1={h - padB}
                x2={x(i)}
                y2={h - padB + 5}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text
                x={x(i)}
                y={h - 8}
                textAnchor="middle"
                fontSize={pdfMode ? "10" : "11"}
                fill="#64748b"
              >
                {hourLabel(th)}
              </text>
            </g>
          );
        })}

        {yTicks.map((tv) => {
          const yy = y(tv);
          const yBottom = h - padB;
          if (yy > yBottom) return null;

          return (
            <g key={tv}>
              <line
                x1={padL}
                y1={yy}
                x2={w - padR}
                y2={yy}
                stroke="#e5e7eb"
                strokeOpacity="0.7"
                strokeWidth="1"
              />
              <text
                x={padL - 7}
                y={yy + 4}
                textAnchor="end"
                fontSize={pdfMode ? "10" : "11"}
                fill="#64748b"
              >
                {Number(tv).toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={pdfMode ? "mt-1 text-[10px] leading-tight text-slate-500" : "mt-1 text-xs text-slate-500"}>
        Note: values are hourly kWh treated as average kW per hour step.
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

export {
  StackedMonthlyBarChart,
  SolarUsageDonut,
  DailyUsageLineChart,
  TwoBarYearChart,
  CumulativePaybackBarChart,
  DayPowerChart,
};