import {
  getDefaultTariff,
} from "../config/tariffPresets";

export const DEFAULT_TARIFF = getDefaultTariff("after");

export function cleanTariffObject(raw, kind = "after") {
  const source = raw && typeof raw === "object" ? raw : {};

  const cleaned = {
    ...getDefaultTariff(kind),
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

  cleaned.tariffType = String(cleaned.tariffType || "standard").toLowerCase();

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