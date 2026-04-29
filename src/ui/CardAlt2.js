import cx from "./cx";

const styles = {
  cardBase: "cardAlt2",
  cardPdf: "cardAlt2--pdf",
  header: "cardHeaderAlt",
  headerPdf: "cardHeaderAlt--pdf",
  title: "cardTitleAlt",
  titlePdf: "cardTitle--pdf",
  body: "cardBody",
};

export default function CardAlt2({
  title,
  right,
  children,
  className = "",
  bodyClassName = "",
  mode,
  pdfMode = false,
}) {
  const resolvedMode = mode || (pdfMode ? "pdf" : "screen");
  const isPdf = resolvedMode === "pdf";

  return (
    <div
      className={cx(
        styles.cardBase,
        isPdf && styles.cardPdf,
        className
      )}
    >
      {(title || right) ? (
        <div
          className={cx(
            styles.header,
            isPdf && styles.headerPdf
          )}
        >
          <div className={cx(styles.title, isPdf && styles.titlePdf)}>{title}</div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      ) : null}

      <div className={cx(styles.body, bodyClassName)}>
        {children}
      </div>
    </div>
  );
}