import { useState } from "react";

import {
  DEFAULT_ROOFS,
  EMPTY_DRAFT_ROOF,
} from "../utils/appStateUtils";

export default function useRoofWizard({ savedRoofs, setError }) {
  const [roofModalOpen, setRoofModalOpen] = useState(false);
  const [roofWizardStep, setRoofWizardStep] = useState(0);
  const [editingRoofId, setEditingRoofId] = useState(null);

  const [draftRoof, setDraftRoof] = useState(EMPTY_DRAFT_ROOF);

  const [roofs, setRoofs] = useState(() => {
    if (Array.isArray(savedRoofs) && savedRoofs.length > 0) {
      return savedRoofs;
    }

    return DEFAULT_ROOFS();
  });

  function openAddRoofModal() {
    setEditingRoofId(null);
    setDraftRoof(EMPTY_DRAFT_ROOF());
    setRoofWizardStep(0);
    setError?.("");
    setRoofModalOpen(true);
  }

  function openEditRoofModal(roof) {
    setEditingRoofId(roof.id);
    setDraftRoof({ ...roof });
    setRoofWizardStep(0);
    setError?.("");
    setRoofModalOpen(true);
  }

  function closeRoofModal() {
    setRoofModalOpen(false);
    setEditingRoofId(null);
    setRoofWizardStep(0);
    setError?.("");
  }

  function saveRoofFromDraft() {
    if (!draftRoof.orientation || !draftRoof.tilt || !draftRoof.shading) {
      setError?.("Please complete the roof details before saving.");
      return false;
    }

    if (!draftRoof.panels || Number(draftRoof.panels) <= 0) {
      setError?.("Please enter how many panels fit on this roof.");
      return false;
    }

    setRoofs((prev) => {
      if (editingRoofId) {
        return prev.map((r) =>
          r.id === editingRoofId ? { ...draftRoof } : r
        );
      }

      return [
        ...prev,
        {
          ...draftRoof,
          id:
            draftRoof.id ||
            (crypto?.randomUUID
              ? crypto.randomUUID()
              : `roof-${Date.now()}`),
        },
      ];
    });

    closeRoofModal();
    return true;
  }

  function resetRoofs() {
    setRoofs(DEFAULT_ROOFS());
    setDraftRoof(EMPTY_DRAFT_ROOF());
    setRoofWizardStep(0);
    setEditingRoofId(null);
    setRoofModalOpen(false);
  }

  return {
    roofModalOpen,
    setRoofModalOpen,

    roofWizardStep,
    setRoofWizardStep,

    editingRoofId,
    setEditingRoofId,

    draftRoof,
    setDraftRoof,

    roofs,
    setRoofs,

    openAddRoofModal,
    openEditRoofModal,
    closeRoofModal,
    saveRoofFromDraft,
    resetRoofs,
  };
}