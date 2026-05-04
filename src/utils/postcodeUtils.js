export function formatPostcodeInput(value) {
  const raw = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (raw.length <= 3) return raw;

  const outward = raw.slice(0, -3);
  const inward = raw.slice(-3);

  return `${outward} ${inward}`.trim();
}

export function normalisePostcode(value) {
  return formatPostcodeInput(value);
}

export function isValidUkPostcode(value) {
  const formatted = formatPostcodeInput(value);

  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}$/;

  return postcodeRegex.test(formatted);
}