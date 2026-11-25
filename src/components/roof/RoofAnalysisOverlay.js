import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACTIVE_THEME_STYLE } from "../../config/siteConfig";

const copy = {
  roof: {
    heading: "Analysing your roof",
    description:
      "We’re identifying suitable areas for solar panels and checking your roof’s available space.",
  },
  boundary: {
    heading: "Checking your roof boundary",
    description: "We’re checking the roof space within the boundary you marked.",
  },
  additional: {
    heading: "Updating your roof assessment",
    description: "We’re checking the roof space for your updated building selection.",
  },
};

export default function RoofAnalysisOverlay({ kind, onCancel }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const headingId = useId();
  const descriptionId = useId();
  const [takingLonger, setTakingLonger] = useState(false);
  const { heading, description } = copy[kind];

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    cancelRef.current.focus();

    return () => dialog.close();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setTakingLonger(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      style={ACTIVE_THEME_STYLE}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-accent motion-reduce:animate-none"
      />
      <div role="status" aria-live="polite" aria-atomic="true">
        <h3 id={headingId} className="text-lg font-semibold text-slate-900">
          {heading}
        </h3>
        <p id={descriptionId} className="mt-2 text-sm text-slate-600">
          {description}
        </p>
        {takingLonger && (
          <p className="mt-3 text-sm text-slate-600">
            Some properties take a little longer to analyse. We’re still checking yours.
          </p>
        )}
      </div>
      <button ref={cancelRef} type="button" className="secondary-mini mt-4" onClick={onCancel}>
        Cancel analysis
      </button>
    </dialog>,
    document.body
  );
}
