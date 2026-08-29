function sum(arr) {
  return (arr || []).map(Number).reduce((a, b) => a + b, 0);
}

function formatNumber(n, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function occupancyLabel(profile) {
  const map = {
    home_all_day: "At Home All Day",
    half_day: "In Half Day",
    out_all_day: "Out All Day",
  };
  return map[profile] || "—";
}

function buildGroupText(groups, field, formatter) {
  if (!Array.isArray(groups) || groups.length === 0) return "—";

  return groups
    .map((g) => `Group ${g.group}: ${formatter(g[field], g)}`)
    .join("  ");
}

function getPostcodeRegion(postcode) {
  if (!postcode) return "—";

  const pc = String(postcode).trim().toUpperCase();

  // Extract outward code (e.g. "SK13", "GU11", "LS1")
  const outward = pc.split(" ")[0];

  // Extract area letters (e.g. "SK", "GU", "LS")
  const area = outward.replace(/[0-9].*$/, "");

  // -----------------------------
  // MCS REGION LOOKUP (condensed)
  // -----------------------------
  const regionMap = {
    AB: "16",
    AL: "1",
    B: "6",
    BA: "5E",
    BB: "7E",
    BD: "11",
    BH: "3",
    BL: "7E",
    BN: "2",
    BR: "2",
    BS: "5E",
    CA: "8E",
    CB: "12",
    CF: "5W",
    CH: "7E",
    CM: "12",
    CO: "12",
    CR: "1",
    CT: "2",
    CV: "6",
    CW: "7E",
    DA: "2",
    DD: "15",
    DE: "6",
    DG: "8S",
    DH: "10",
    DL: "10",
    DN: "11",
    DT: "3",
    DY: "6",
    E: "1",
    EC: "1",
    EH: "15",
    EN: "1",
    EX: "4",
    FK: "14",
    FY: "7E",
    G: "14",
    GL: "5E",
    GU: "1",
    HA: "1",
    HD: "11",
    HG: "10",
    HP: "1",
    HR: "6",
    HS: "18",
    HU: "11",
    HX: "11",
    IG: "12",
    IP: "12",
    IV: "17",
    KA: "14",
    KT: "1",
    KW: "17",
    KY: "15",
    L: "7E",
    LA: "7E",
    LD: "13",
    LE: "6",
    LL: "7W",
    LN: "11",
    LS: "11",
    LU: "1",
    M: "7E",
    ME: "2",
    MK: "1",
    ML: "14",
    N: "1",
    NE: "9E",
    NG: "11",
    NN: "6",
    NP: "5W",
    NR: "12",
    NW: "1",
    OL: "7E",
    OX: "1",
    PA: "14",
    PE: "12",
    PH: "15",
    PL: "4",
    PO: "3",
    PR: "7E",
    RG: "1",
    RH: "1",
    RM: "12",
    S: "11",
    SA: "5W",
    SE: "1",
    SG: "1",
    SK: "6",
    SL: "1",
    SM: "1",
    SN: "5E",
    SO: "3",
    SP: "5E",
    SR: "9E",
    SS: "12",
    ST: "6",
    SW: "1",
    SY: "6",
    TA: "5E",
    TD: "9S",
    TF: "6",
    TN: "2",
    TQ: "4",
    TR: "4",
    TS: "10",
    TW: "1",
    UB: "1",
    W: "1",
    WA: "7E",
    WC: "1",
    WD: "1",
    WF: "11",
    WN: "7E",
    WR: "6",
    WS: "6",
    WV: "6",
    YO: "10",
    ZE: "20",
  };

  return regionMap[area] || "—";
}


//=========//
// SHADING //
//=========//


// Degrees from South as a positive absolute deviation.
// South = 0, East/West = 90, North = 180.
function degreesFromSouth(orientation) {
  if (!orientation) return null;

  const map = {
    N: 180,
    NNE: 157.5,
    NE: 135,
    ENE: 112.5,
    E: 90,
    ESE: 67.5,
    SE: 45,
    SSE: 22.5,
    S: 0,
    SSW: 22.5,
    SW: 45,
    WSW: 67.5,
    W: 90,
    WNW: 112.5,
    NW: 135,
    NNW: 157.5,
  };

  const key = String(orientation).trim().toUpperCase();
  return map[key] ?? null;
}

export function getMcsTableData({ quote, form, roofs }) {
  const hm = quote?.hourlyModel || {};

  const systemSizeKwp = Number(quote?.systemSizeKwp || 0);
  const roofGroups = quote?.mcsRoofGroups || [];

  const annualGeneration =
    Number(hm?.annualGenerationKWh) ||
    sum(hm?.monthlyGenerationKWh) ||
    Number(quote?.estAnnualGenerationKWh) ||
    0;

  const annualConsumption =
    Number(quote?.assumedAnnualConsumptionKWh) ||
    Number(form?.annualKWh) ||
    0;

  const pvOnlySelfConsumption = sum(hm?.monthlyDirectToHomeKWh);

  const pvWithEessSelfConsumption =
    sum(hm?.monthlyDirectToHomeKWh) +
    sum(hm?.monthlyBatteryDischargeFromPVToLoadKWh);

  const pvOnlyIndependencePct =
    annualConsumption > 0 ? (pvOnlySelfConsumption / annualConsumption) * 100 : 0;

  const withEessIndependencePct =
    annualConsumption > 0 ? (pvWithEessSelfConsumption / annualConsumption) * 100 : 0;

  const usableBatteryKwh =
    Number(hm?._batteryKWh) ||
    Number(form?.batteryCapacity) ||
    Number(form?.batteryKWh) ||
    0;

  const hasBattery = usableBatteryKwh > 0;

  const totalBatteryDischarged = sum(hm?.monthlyBatteryDischargeKWh);

  const batteryEnergyNotForSelfConsumption = sum(hm?.monthlyBatteryDischargeFromGridToLoadKWh);

  const additionalSelfConsumptionLoads =
    form?.evCharger || form?.heatPump || form?.diverter ? 0 : 0;

  const postcodeRegion =
    form?.postcodeRegion ||
    quote?.postcodeRegion ||
    getPostcodeRegion(form?.postcode);

  const annualGenerationRounded = Math.round(annualGeneration);
  const annualConsumptionRounded = Math.round(annualConsumption);

  return { hasBattery,
    sectionA: [
      ["Installed capacity of PV system - kWp (stc)", formatNumber(systemSizeKwp, 3), "kWp"],
      [
        "Orientation of the PV system - degrees from South",
        buildGroupText(roofGroups, "orientation", (value) => {
          const deg = degreesFromSouth(value);
          return deg != null ? `${formatNumber(deg, 0)}°` : "—";
        }),
        "°",
      ],
      [
        "Inclination of system - degrees from horizontal",
        buildGroupText(roofGroups, "tilt", (value) => value != null ? `${formatNumber(value, 0)}°` : "—"),
        "°",
      ],
      ["Postcode region", postcodeRegion, ""],
    ],

    sectionB: [
      [
        "kWh/kWp (Kk)",
        buildGroupText(roofGroups, "kk", (value) => formatNumber(value, 0)),
        "kWh/kWp",
      ],
      [
        "Shade Factor (SF)",
        buildGroupText(roofGroups, "shadeFactor", (value) => formatNumber(value, 3)),
        "",
      ],
      [
        "Estimated annual output",
        formatNumber(annualGenerationRounded, 0),
        "kWh",
      ],
    ],
    sectionC: [
      ["Assumed occupancy archetype", occupancyLabel(form?.occupancyProfile), ""],
      [
        "Assumed annual electricity consumption, kWh",
        formatNumber(annualConsumptionRounded, 0),
        "kWh",
      ],
      [
        "Assumed annual electricity generation from solar PV system, kWh",
        formatNumber(annualGenerationRounded, 0),
        "kWh",
      ],
      [
        "Expected solar PV self-consumption (PV Only)",
        formatNumber(Math.round(pvOnlySelfConsumption), 0),
        "kWh",
      ],
      [
        "Grid electricity independence / Self-sufficiency (PV Only)",
        formatNumber(pvOnlyIndependencePct, 1),
        "%",
      ],
    ],
    sectionD: [
      [
        "Assumed usable capacity of electricity energy storage device, which is used for self-consumption, kWh",
        formatNumber(usableBatteryKwh, 2),
        "kWh",
      ],
      [
        "Expected solar PV self-consumption (with EESS)",
        formatNumber(Math.round(pvWithEessSelfConsumption), 0),
        "kWh",
      ],
      [
        "Grid electricity independence / Self-sufficiency (with EESS)",
        formatNumber(withEessIndependencePct, 1),
        "%",
      ],
    ],
    sectionE: [
      [
        "EESS capacity not used for self-consumption",
        formatNumber(batteryEnergyNotForSelfConsumption, 2),
        "kWh",
      ],
      [
        "Total energy discharged per annum",
        formatNumber(Math.round(totalBatteryDischarged), 0),
        "kWh",
      ],
      [
        "Additional self-consumption for EV, heat pumps, diverters (only when present)",
        formatNumber(additionalSelfConsumptionLoads, 2),
        "kWh",
      ],
    ],
  };
}