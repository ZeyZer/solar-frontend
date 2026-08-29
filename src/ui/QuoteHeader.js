import cx from "./cx";

const styles = {
  outer:
    "-mt-px w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] border-b border-accent bg-accent",

  containerScreen: "container-app py-6 sm:py-8",
  containerPdf: "container-app py-2",

  innerScreen: "mt-10 text-center",
  innerPdf: "mt-2 text-center",

  titleBase: "text-white",
  titleScreen: "mt-12 text-[3rem] leading-[3.15rem] sm:mt-16 sm:text-[4rem] sm:leading-[4.1rem] lg:mt-20 lg:text-h4",
  titlePdf: "mt-1 text-h1",

  subtitleBase: "mx-auto text-white",
  subtitleScreen: "mt-6 mb-10 max-w-2xl text-base leading-7 sm:mt-8 sm:mb-14 sm:text-h3 lg:mt-10 lg:mb-[8rem]",
  subtitlePdf: "mt-2 max-w-xl text-body",
};

export default function QuoteHeader({
  onExit,
  subtitle,
  showNav = true,
  onJumpTo,
  mode,
  pdfMode = false,
}) {
  const resolvedMode = mode || (pdfMode ? "pdf" : "screen");
  const isPdf = resolvedMode === "pdf";

  return (
    <div className={styles.outer}>
      <div className={isPdf ? styles.containerPdf : styles.containerScreen}>
        <div className={isPdf ? styles.innerPdf : styles.innerScreen}>
          <h4
            className={cx(
              styles.titleBase,
              isPdf ? styles.titlePdf : styles.titleScreen
            )}
          >
            Your Solar Quote,
            <p>Bespoke For Your Home</p>
          </h4>

          <p
            className={cx(
              styles.subtitleBase,
              isPdf ? styles.subtitlePdf : styles.subtitleScreen
            )}
          >
            {subtitle ||
              "Review your system design, projected performance and savings — then choose your next step."}
          </p>
        </div>
      </div>
    </div>
  );
}