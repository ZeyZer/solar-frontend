import cx from "./cx";

const styles = {
  card: "cardAlt",
  header: "cardHeaderAlt",
  title: "cardTitleAlt",
  titlePdf: "cardTitle--pdf",
  body: "cardBody",
};

export default function CardAlt({
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
    <div className={cx(styles.card, className)}>
      {(title || right) ? (
        <div className={styles.header}>
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