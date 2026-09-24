import { DEFAULT_TARIFF } from "./tariffUtils";

/**
 * =========================================================
 * Local storage persistence helpers
 * =========================================================
 */
const STORAGE_KEY = "zeyzer_quote_state";

const TOTAL_STEPS = 5;

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}


/**
 * =========================================================
 * Default form state
 * =========================================================
 */
const DEFAULT_FORM = {
  name: "",
  email: "",
  address: "",
  phone: "",

  homeOwnership: "",
  houseNumber: "",
  roadName: "",
  town: "",
  postcode: "",
  selectedAddress: null,

  annualKWh: "",
  monthlyBill: "",
  roofSize: "medium",
  shading: "none",
  occupancyProfile: "half_day",

  panelOption: "value",

  // Battery choice intent is separate from the physical capacity.
  // "recommend" lets Zeyzer activate the balanced recommendation
  // once the quote's battery scenarios have been calculated.
  batteryChoiceMode: "recommend",
  batteryStrategy: "balanced",

  // batteryKWh is the battery currently active in the quote.
  batteryKWh: 0,

  // Keep the customer's own requested size even while they
  // temporarily view a recommendation or the no-battery option.
  batteryCustomKWh: 10,

  birdProtection: false,
  evCharger: false,

  // ✅ NEW: baseline (before solar) vs solar (after solar) tariffs
  tariffBefore: {
    ...DEFAULT_TARIFF,
    // baseline doesn't need export, but leaving it doesn't hurt
  },

  tariffAfter: {
    ...DEFAULT_TARIFF,
  },
};


const DEFAULT_ROOFS = () => ([]);

const EMPTY_DRAFT_ROOF = () => ({
    id: crypto.randomUUID(),
    orientation: "",
    tilt: null,
    shading: "",
    roofSize: "",
    panels: 0,
});

export {
  STORAGE_KEY,
  TOTAL_STEPS,
  DEFAULT_FORM,
  DEFAULT_ROOFS,
  EMPTY_DRAFT_ROOF,
  loadSavedState,
};

  