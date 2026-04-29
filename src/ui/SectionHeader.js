import cx from "./cx";

const styles = {
  wrap: "flex items-start justify-between",
  wrapScreen: "mt-12 sm:mt-14 lg:mt-20 gap-4",
  wrapPdf: "mt-1 gap-3",

  title: "text-h1 text-ink",
  titlePdf: "font-semibold leading-tight",

  description: "text-body text-ink",
  descriptionScreen: "",
  descriptionPdf: "mt-0.5 mb-1 mode-pdf-copy",

  actionScreen: "pt-1",
  actionPdf: "pt-0",
};

export default function SectionHeader({
  title,
  description,
  action,
  mode,
  pdfMode = false,
}) {
  const resolvedMode = mode || (pdfMode ? "pdf" : "screen");
  const isPdf = resolvedMode === "pdf";

  return (
    <div
      className={cx(
        styles.wrap,
        isPdf ? styles.wrapPdf : styles.wrapScreen
      )}
    >
      <div>
        <h1
          className={cx(
            styles.title,
            isPdf && styles.titlePdf
          )}
        >
          {title}
        </h1>

        {description ? (
          <p
            className={cx(
              styles.description,
              isPdf ? styles.descriptionPdf : styles.descriptionScreen
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className={isPdf ? styles.actionPdf : styles.actionScreen}>
          {action}
        </div>
      ) : null}
    </div>
  );
}