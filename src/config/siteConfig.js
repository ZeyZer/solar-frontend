export const PLATFORM = {
  toolName: "Zeyzer Solar",
  headline: "Instant Solar Estimate For Your Home",
  subheadline:
    "Get a personalised price, savings and payback estimate in under 60 seconds.",
  contactEmail: "hello@zeyzersolar.com",
  trustBadges: [
    "✅ No-obligation estimate",
    "⚡ Takes under 60 seconds",
    "🔒 Your data is kept private",
  ],
};

export const MARKETING_SITE_URL = "https://www.zeyzersolar.com";
export const PRIVACY_POLICY_URL = "https://www.zeyzersolar.com/privacy-policy";
export const ESTIMATE_DISCLAIMER_URL = "https://www.zeyzersolar.com/estimate-disclaimer";

export const ESTIMATE_DISCLAIMER_SHORT =
  "This is an estimate, not a final quote. Final pricing, system design and performance depend on survey, equipment selection, roof condition, grid connection and installer confirmation.";

export const CALCULATOR_STARTS_OPEN = true;

export const INSTALLER = null;

export const CONTACT_EMAIL =
  (INSTALLER && INSTALLER.contactEmail) || PLATFORM.contactEmail;