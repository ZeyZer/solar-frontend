import cx from "./cx";

const styles = {
  outerBase: "rounded-2xl border-2 border-slate-200 bg-white h-full",
  outerScreen: "p-5 shadow-bubble",
  outerPdf: "mode-pdf-tight",

  titleBase: "font-semibold text-brand",
  titleScreen: "text-body",
  titlePdf: "text-sm leading-tight",

  summaryBase: "text-brand",
  summaryScreen: "mt-1 text-sm",
  summaryPdf: "mt-1 text-xs mode-pdf-copy",

  contentGridBase: "items-stretch",
  contentGridScreen: "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-stretch",
  contentGridPdf: "mt-2 grid grid-cols-5 gap-2 items-stretch",

  imageColScreen: "sm:col-span-2",
  imageColPdf: "col-span-2",

  imageWrapBase: "overflow-hidden rounded-2xl",
  imageWrapScreen: "h-[160px] sm:h-[200px] flex items-center justify-center",
  imageWrapPdf: "flex items-center justify-center h-[190px]",

  imageBase: "w-full",
  imageScreen: "h-[140px] object-contain sm:h-[200px] lg:h-[240px]",
  imagePdf: "h-[200px] object-contain mx-auto",

  aboutColScreen: "sm:col-span-3",
  aboutColPdf: "col-span-3",

  aboutBoxBase: "h-full rounded-2xl border-2 border-sky-100",
  aboutBoxScreen: "bg-sky-50 shadow-soft p-4",
  aboutBoxPdf: "p-2",

  aboutLabelBase: "font-semibold uppercase tracking-wide text-accent",
  aboutLabelScreen: "text-small",
  aboutLabelPdf: "text-[10px] leading-tight",

  aboutTitleBase: "font-semibold text-slate-900",
  aboutTitleScreen: "mt-2 text-body",
  aboutTitlePdf: "mt-1 text-xs leading-tight",

  aboutTextBase: "text-slate-600",
  aboutTextScreen: "mt-1 text-sm leading-6",
  aboutTextPdf: "mt-1 text-[11px] leading-[1.15rem]",
};

export default function ConfigChoiceCard({
  title,
  summary,
  imageSrc,
  aboutTitle,
  aboutText,
  mode,
  pdfMode = false,
}) {
  const resolvedMode = mode || (pdfMode ? "pdf" : "screen");
  const isPdf = resolvedMode === "pdf";

  return (
    <div
      className={cx(
        styles.outerBase,
        isPdf ? styles.outerPdf : styles.outerScreen
      )}
    >
      <div>
        <div
          className={cx(
            styles.titleBase,
            isPdf ? styles.titlePdf : styles.titleScreen
          )}
        >
          {title}
        </div>

        <p
          className={cx(
            styles.summaryBase,
            isPdf ? styles.summaryPdf : styles.summaryScreen
          )}
        >
          {summary}
        </p>
      </div>

      <div
        className={cx(
          styles.contentGridBase,
          isPdf ? styles.contentGridPdf : styles.contentGridScreen
        )}
      >
        <div className={isPdf ? styles.imageColPdf : styles.imageColScreen}>
          <div
            className={cx(
              styles.imageWrapBase,
              isPdf ? styles.imageWrapPdf : styles.imageWrapScreen
            )}
          >
            <img
              src={imageSrc}
              alt={aboutTitle || title}
              className={cx(
                styles.imageBase,
                isPdf ? styles.imagePdf : styles.imageScreen
              )}
              loading="eager"
            />
          </div>
        </div>

        <div className={isPdf ? styles.aboutColPdf : styles.aboutColScreen}>
          <div
            className={cx(
              styles.aboutBoxBase,
              isPdf ? styles.aboutBoxPdf : styles.aboutBoxScreen
            )}
          >
            <div
              className={cx(
                styles.aboutLabelBase,
                isPdf ? styles.aboutLabelPdf : styles.aboutLabelScreen
              )}
            >
              About your choice
            </div>

            <div
              className={cx(
                styles.aboutTitleBase,
                isPdf ? styles.aboutTitlePdf : styles.aboutTitleScreen
              )}
            >
              {aboutTitle || title}
            </div>

            <p
              className={cx(
                styles.aboutTextBase,
                isPdf ? styles.aboutTextPdf : styles.aboutTextScreen
              )}
            >
              {aboutText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}