import { useEffect, useRef, useState } from "react";

const DEFAULT_PROGRESS = {
  pct: 0,
  label: "Building your solar estimate…",
  step: "starting",
};

const PROGRESS_STEPS = [
  {
    pct: 0,
    step: "starting",
    label: "Building your solar estimate…",
  },
  {
    pct: 18,
    step: "fetching_pvgis",
    label: "Modelling your solar potential…",
  },
  {
    pct: 34,
    step: "modelling_demand",
    label: "Matching generation to your energy use…",
  },
  {
    pct: 52,
    step: "simulating_battery",
    label: "Comparing solar and battery options…",
  },
  {
    pct: 70,
    step: "financials",
    label: "Calculating estimated savings and payback…",
  },
  {
    pct: 86,
    step: "optimising_battery",
    label: "Preparing your recommendations…",
  },
  {
    pct: 94,
    step: "finalising",
    label: "Finalising your personalised estimate…",
  },
];

export default function useFakeQuoteProgress() {
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);

  const fakeTimerRef = useRef(null);
  const fakeStartRef = useRef(0);

  function stopFakeProgress() {
    if (fakeTimerRef.current) {
      clearInterval(fakeTimerRef.current);
      fakeTimerRef.current = null;
    }
  }

  function resetProgress() {
    stopFakeProgress();
    setProgress(DEFAULT_PROGRESS);
  }

  function startFakeProgress(durationMs = 40000) {
    stopFakeProgress();

    fakeStartRef.current = Date.now();

    setProgress({
      pct: 0,
      label: "Building your solar estimate…",
      step: "starting",
    });

    fakeTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - fakeStartRef.current;
      const ratio = Math.min(1, elapsed / durationMs);

      // Ease out so it moves quickly at first, then slows near the end.
      const eased = 1 - Math.pow(1 - ratio, 2);
      const pct = Math.min(94, Math.round(eased * 94));

      const currentStep =
        [...PROGRESS_STEPS]
          .reverse()
          .find((step) => pct >= step.pct) || PROGRESS_STEPS[0];

      setProgress((prev) => ({
        ...prev,
        pct: Math.max(prev.pct || 0, pct),
        label: currentStep.label,
        step: currentStep.step,
      }));

      if (pct >= 94) {
        stopFakeProgress();
      }
    }, 250);
  }

  function completeProgress() {
    stopFakeProgress();

    setProgress((prev) => ({
      ...prev,
      pct: 100,
      step: "finalising",
      label: "Your estimate is ready.",
    }));
  }

  useEffect(() => {
    return () => {
      stopFakeProgress();
    };
  }, []);

  return {
    progress,
    setProgress,
    startFakeProgress,
    stopFakeProgress,
    resetProgress,
    completeProgress,
  };
}
