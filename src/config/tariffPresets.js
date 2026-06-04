export const DEFAULT_TARIFF_PRESETS = {
  standard: {
    tariffType: "standard",

    importPrice: 0.28,
    segPrice: 0.12,
    standingChargePerDay: 0.60,

    importNight: 0.08,
    importDay: 0.30,
    nightStartHour: 0,
    nightEndHour: 7,

    importOffPeak: 0.15,
    importPeak: 0.40,
    exportOffPeak: 0.08,
    exportPeak: 0.30,
    offPeakStartHour: 0,
    offPeakEndHour: 6,
    peakStartHour: 16,
    peakEndHour: 19,

    exportFromBatteryEnabled: true,
    allowGridCharging: false,
    allowEnergyTrading: false,
    energyInflationRate: 0.06,
  },

  overnight: {
    tariffType: "overnight",

    importPrice: 0.28,
    segPrice: 0.12,
    standingChargePerDay: 0.60,

    importNight: 0.08,
    importDay: 0.30,
    nightStartHour: 0,
    nightEndHour: 7,

    importOffPeak: 0.15,
    importPeak: 0.40,
    exportOffPeak: 0.04,
    exportPeak: 0.30,
    offPeakStartHour: 0,
    offPeakEndHour: 6,
    peakStartHour: 16,
    peakEndHour: 19,

    exportFromBatteryEnabled: true,
    allowGridCharging: true,
    allowEnergyTrading: false,
    energyInflationRate: 0.06,
  },

  flux: {
    tariffType: "flux",

    importPrice: 0.28,
    segPrice: 0.12,
    standingChargePerDay: 0.60,

    importNight: 0.08,
    importDay: 0.30,
    nightStartHour: 0,
    nightEndHour: 7,

    importOffPeak: 0.15,
    importPeak: 0.40,
    exportOffPeak: 0.04,
    exportPeak: 0.30,
    offPeakStartHour: 0,
    offPeakEndHour: 6,
    peakStartHour: 16,
    peakEndHour: 19,

    exportFromBatteryEnabled: true,
    allowGridCharging: true,
    allowEnergyTrading: false,
    energyInflationRate: 0.06,
  },
};

export const TARIFF_MODEL_ASSUMPTIONS = {
  model: "hourly-tou-v1",
  timeResolution: "hourly",
  supportsHalfHourly: false,
  defaultTariffType: "standard",
  availableTariffTypes: ["standard", "overnight", "flux"],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normaliseTariffType(tariffType) {
  const type = String(tariffType || "standard").toLowerCase();

  if (DEFAULT_TARIFF_PRESETS[type]) {
    return type;
  }

  return "standard";
}

export function getTariffPreset(tariffType = "standard") {
  const type = normaliseTariffType(tariffType);
  return clone(DEFAULT_TARIFF_PRESETS[type]);
}

export function getDefaultTariff(kind = "after") {
  const tariff = getTariffPreset("standard");
  tariff.kind = kind;
  return tariff;
}