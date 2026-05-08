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

export const CALCULATOR_STARTS_OPEN = true;

export const INSTALLER = null;

export const CONTACT_EMAIL =
  (INSTALLER && INSTALLER.contactEmail) || PLATFORM.contactEmail;