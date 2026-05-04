export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function toNumber(value, fallback = 0) {
  if (value == null) return fallback;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);

  return Number.isFinite(n) ? n : fallback;
}

export function formatWholeNumber(value) {
  return Math.round(toNumber(value)).toLocaleString("en-GB");
}

export function formatMoney(value) {
  return `£${Math.round(toNumber(value)).toLocaleString("en-GB")}`;
}

export function formatKWh(value) {
  return `${formatWholeNumber(value)} kWh`;
}

export function formatKwp(value) {
  const n = toNumber(value);
  return `${n.toFixed(1)} kWp`;
}

export function formatPercent(value, decimals = 0) {
  const n = toNumber(value, null);

  if (n == null) return "—";

  return `${n.toFixed(decimals)}%`;
}

export function calculateIRR(cashflows, guess = 0.08) {
  let rate = guess;

  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + rate, t);
      dnpv -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }

    const newRate = rate - npv / dnpv;

    if (!Number.isFinite(newRate)) return null;

    if (Math.abs(newRate - rate) < 1e-6) {
      return newRate;
    }

    rate = newRate;
  }

  return null;
}

export function buildMonthlySavingsRows(quote) {
  const monthly = quote?.financialSeries?.monthly || {};

  const asArray12 = (value) => {
    if (Array.isArray(value)) {
      return MONTH_LABELS.map((_, i) => toNumber(value[i]));
    }

    return Array(12).fill(0);
  };

  const monthlyLoad = asArray12(
    quote?.hourlyModel?.monthlyLoadKWh ||
    quote?.monthlyLoadKWh
  );

  const baseline = asArray12(
    monthly.monthlyBaseline ||
    monthly.baselineMonthlyCost
  );

  const afterImportAndStanding = asArray12(
    monthly.monthlyAfterImportAndStanding ||
    monthly.systemMonthlyCostBeforeSEG
  );

  const exportCredit = asArray12(
    monthly.monthlyExportCredit ||
    monthly.exportCreditMonthly
  );

  const afterNet = asArray12(
    monthly.monthlyAfterNet ||
    monthly.systemMonthlyNet ||
    monthly.monthlyAfter
  );

  return MONTH_LABELS.map((month, i) => {
    const demandKWh = toNumber(monthlyLoad[i]);
    const oldBill = toNumber(baseline[i]);
    const newImportCost = toNumber(afterImportAndStanding[i]);
    const segIncome = toNumber(exportCredit[i]);

    const fallbackNewBill = newImportCost - segIncome;
    const newBill = toNumber(afterNet[i], fallbackNewBill);

    const monthlySavings = oldBill - newBill;

    return {
      month,
      demandKWh: Math.round(demandKWh),
      oldBill: Number(oldBill.toFixed(2)),
      newImportCost: Number(newImportCost.toFixed(2)),
      segIncome: Number(segIncome.toFixed(2)),
      newBill: Number(newBill.toFixed(2)),
      monthlySavings: Number(monthlySavings.toFixed(2)),
    };
  });
}