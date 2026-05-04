import React from "react";

function FinanceDetailsModal({ open, onClose, rows }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <div className="text-base font-semibold text-slate-900">Financial calculation details</div>
            <div className="mt-1 text-sm text-slate-600">
              Year-by-year projection including 6% energy cost increase.
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
          <FinanceDetailsTable rows={rows} />

          <p className="mt-3 text-xs text-slate-500">
            Net position = cumulative bill savings minus system cost (mid price). Solar generation is held constant unless degradation is applied.
          </p>
        </div>
      </div>
    </div>
  );
}

function FinanceDetailsTable({ rows, pdfMode = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div
        className={
          pdfMode
            ? "grid grid-cols-6 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600"
            : "grid grid-cols-6 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
        }
      >
        <div>Year</div>
        <div className="text-right">Solar gen (kWh)</div>
        <div className="text-right">Bill before</div>
        <div className="text-right">Bill after</div>
        <div className="text-right">Bill saving</div>
        <div className="text-right">Net position</div>
      </div>

      <div className={pdfMode ? "divide-y divide-slate-200 text-[11px]" : "divide-y divide-slate-200 text-sm"}>
        {(rows || []).map((r) => (
          <div key={r.year} className={pdfMode ? "grid grid-cols-6 px-3 py-2" : "grid grid-cols-6 px-3 py-2"}>
            <div className="font-medium text-slate-900">{r.year}</div>
            <div className="text-right">{Number(r.solarGenerationKWh || 0).toLocaleString()}</div>
            <div className="text-right">£{Number(r.billBefore || 0).toLocaleString()}</div>
            <div className="text-right">£{Number(r.billAfter || 0).toLocaleString()}</div>
            <div className="text-right">£{Number(r.billSavings || 0).toLocaleString()}</div>
            <div className="text-right font-semibold text-slate-900">
              £{Number(r.netPosition || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlySavingsModal({ open, onClose, rows }) {
  if (!open) return null;

  const totals = (rows || []).reduce(
    (acc, r) => {
      acc.demandKWh += Number(r.demandKWh || 0);
      acc.oldBill += Number(r.oldBill || 0);
      acc.newImportCost += Number(r.newImportCost || 0);
      acc.segIncome += Number(r.segIncome || 0);
      acc.newBill += Number(r.newBill || 0);
      acc.monthlySavings += Number(r.monthlySavings || 0);
      return acc;
    },
    {
      demandKWh: 0,
      oldBill: 0,
      newImportCost: 0,
      segIncome: 0,
      newBill: 0,
      monthlySavings: 0,
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <div className="text-base font-semibold text-slate-900">
              Monthly savings breakdown
            </div>
            <div className="mt-1 text-sm text-slate-600">
              First-year monthly demand, pre-solar bill, post-solar import cost, SEG income and net savings.
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
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-7 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <div>Month</div>
              <div className="text-right">Demand (kWh)</div>
              <div className="text-right">Old bill</div>
              <div className="text-right">New import cost</div>
              <div className="text-right">SEG income</div>
              <div className="text-right">New bill</div>
              <div className="text-right">Monthly savings</div>
            </div>

            <div className="divide-y divide-slate-200 text-sm">
              {(rows || []).map((r) => (
                <div key={r.month} className="grid grid-cols-7 px-3 py-2">
                  <div className="font-medium text-slate-900">{r.month}</div>
                  <div className="text-right">{Number(r.demandKWh || 0).toLocaleString()}</div>
                  <div className="text-right">£{Number(r.oldBill || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right">£{Number(r.newImportCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right">£{Number(r.segIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right">£{Number(r.newBill || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right font-semibold text-slate-900">
                    £{Number(r.monthlySavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-7 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900">
                <div>Total</div>
                <div className="text-right">{Math.round(totals.demandKWh).toLocaleString()}</div>
                <div className="text-right">£{totals.oldBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-right">£{totals.newImportCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-right">£{totals.segIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-right">£{totals.newBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-right">£{totals.monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            New bill = new import cost minus SEG income. Monthly savings = old bill minus new bill.
          </p>
        </div>
      </div>
    </div>
  );
}

export {
  FinanceDetailsModal,
  FinanceDetailsTable,
  MonthlySavingsModal,
};