import cx from "./cx";

const styles = {
  statBox: "rounded-2xl border-2 border-gentle text-center",
  statBoxScreen: "shadow-bubble bg-teal-200 p-4",
  statBoxPdf: "bg-white mode-pdf-tight",

  labelScreen: "text-s font-medium text-gentle",
  labelPdf: "text-[11px] font-medium text-gentle mode-pdf-copy",

  valueScreen: "mt-1 text-2xl font-semibold text-black",
  valuePdf: "mt-1 text-lg font-medium leading-tight text-black",

  subScreen: "mt-1 text-xs text-slate-500",
  subPdf: "mt-1 text-[10px] leading-tight text-slate-500",

  gridScreen: "grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4",
  gridPdf: "grid grid-cols-4 gap-2",
};

export function Stat({ label, value, sub, mode, pdfMode = false }) {
  const resolvedMode = mode || (pdfMode ? "pdf" : "screen");
  const isPdf = resolvedMode === "pdf";

  return (
    <div
      className={cx(
        styles.statBox,
        isPdf ? styles.statBoxPdf : styles.statBoxScreen
      )}
    >
      <div className={isPdf ? styles.labelPdf : styles.labelScreen}>
        {label}
      </div>

      <div className={isPdf ? styles.valuePdf : styles.valueScreen}>
        {value}
      </div>

      {sub ? (
        <div className={isPdf ? styles.subPdf : styles.subScreen}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function StatGrid({ children, mode, pdfMode = false }) {
  const resolvedMode = mode || (pdfMode ? "pdf" : "screen");
  const isPdf = resolvedMode === "pdf";

  return (
    <div className={isPdf ? styles.gridPdf : styles.gridScreen}>
      {children}
    </div>
  );
}