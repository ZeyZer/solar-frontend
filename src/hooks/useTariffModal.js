import { useState } from "react";

import {
  DEFAULT_TARIFF,
  cleanTariffObject,
} from "../utils/tariffUtils";

export default function useTariffModal({
  form,
  setForm,
  setNeedsRecalc,
  setUpdatedSections,
}) {
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [tariffEditMode, setTariffEditMode] = useState("after");

  const [draftTariff, setDraftTariff] = useState(() => ({
    ...DEFAULT_TARIFF,
    ...(form?.tariffAfter || {}),
  }));

  function openTariffModal(mode = "after") {
    setTariffEditMode(mode);

    const src = mode === "before"
      ? form.tariffBefore
      : form.tariffAfter;

    setDraftTariff(cleanTariffObject(src, mode));
    setTariffModalOpen(true);
  }

  function switchTariffMode(nextMode) {
    setForm((prev) => {
      const next = { ...prev };

      if (tariffEditMode === "before") {
        next.tariffBefore = cleanTariffObject(
          { ...(prev.tariffBefore || {}), ...draftTariff },
          "before"
        );
      } else {
        next.tariffAfter = cleanTariffObject(
          { ...(prev.tariffAfter || {}), ...draftTariff },
          "after"
        );
      }

      const nextBucket =
        nextMode === "before" ? next.tariffBefore : next.tariffAfter;

      setDraftTariff(cleanTariffObject(nextBucket, nextMode));
      setTariffEditMode(nextMode);

      return next;
    });
  }

  function saveTariffFromDraft() {
    setForm((prev) => {
      if (tariffEditMode === "before") {
        return {
          ...prev,
          tariffBefore: cleanTariffObject(
            { ...(prev.tariffBefore || {}), ...draftTariff },
            "before"
          ),
        };
      }

      return {
        ...prev,
        tariffAfter: cleanTariffObject(
          { ...(prev.tariffAfter || {}), ...draftTariff },
          "after"
        ),
      };
    });

    setNeedsRecalc(true);
    setUpdatedSections([]);
    setTariffModalOpen(false);
  }

  function closeTariffModal() {
    setTariffModalOpen(false);
  }

  return {
    tariffModalOpen,
    setTariffModalOpen,

    tariffEditMode,
    setTariffEditMode,

    draftTariff,
    setDraftTariff,

    openTariffModal,
    switchTariffMode,
    saveTariffFromDraft,
    closeTariffModal,
  };
}