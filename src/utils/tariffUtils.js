export const DEFAULT_TARIFF = {
  tariffType: "standard",

  importPrice: 0.28,
  standingChargePerDay: 0.6,
  segPrice: 0.12,

  importNight: 0.08,
  importDay: 0.28,
  nightStartHour: 0,
  nightEndHour: 7,

  importOffPeak: 0.1,
  importPeak: 0.4,
  exportOffPeak: 0.05,
  exportPeak: 0.3,
  offPeakStartHour: 2,
  offPeakEndHour: 5,
  peakStartHour: 16,
  peakEndHour: 19,

  exportFromBatteryEnabled: true,
  allowGridCharging: false,
  allowEnergyTrading: false,
  energyInflationRate: 0.06,
};

export function cleanTariffObject(raw, kind = "after") {
  const source = raw && typeof raw === "object" ? raw : {};

  const cleaned = {
    ...DEFAULT_TARIFF,
  };

  const allowedKeys = [
    "tariffType",
    "importPrice",
    "standingChargePerDay",
    "segPrice",
    "importNight",
    "importDay",
    "nightStartHour",
    "nightEndHour",
    "importOffPeak",
    "importPeak",
    "exportOffPeak",
    "exportPeak",
    "offPeakStartHour",
    "offPeakEndHour",
    "peakStartHour",
    "peakEndHour",
    "exportFromBatteryEnabled",
    "allowGridCharging",
    "allowEnergyTrading",
    "energyInflationRate",
  ];

  for (const key of allowedKeys) {
    if (source[key] !== undefined) {
      cleaned[key] = source[key];
    }
  }

  delete cleaned.before;
  delete cleaned.after;
  delete cleaned.tariff;

  if (kind === "before") {
    delete cleaned.segPrice;
    delete cleaned.exportOffPeak;
    delete cleaned.exportPeak;
    delete cleaned.exportFromBatteryEnabled;
    delete cleaned.allowGridCharging;
    delete cleaned.allowEnergyTrading;
  }

  return cleaned;
}