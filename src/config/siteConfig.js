export const DEFAULT_THEME = {
  ink: "32 22 60",
  muted: "47 84 198",
  subtle: "148 163 184",

  surface: "255 255 255",
  canvas: "248 250 252",
  soft: "241 245 249",
  line: "226 232 240",

  brand: "32 22 60",
  brandSoft: "235 235 235",
  accent: "37 99 235",
  pop: "217 224 33",
  gentle: "5 158 148",
};

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
  urls: {
    website: "https://www.zeyzersolar.com",
    privacy: "https://www.zeyzersolar.com/privacy-policy",
    estimateDisclaimer: "https://www.zeyzersolar.com/estimate-disclaimer",
    advice: "https://zeyzersolar.com/solar-advice-hub/",
  },
};

const ZION_ENERGY_TENANT = {
  id: "zion-energy",
  name: "Zion Energy",
  shortName: "Zion Energy",
  initials: "ZE",

  contact: {
    // Falls back to the platform contact until a Zion-specific
    // calculator contact address is deliberately configured.
    email: null,
    phone: null,
  },

  urls: {
    website: "https://www.zionenergy.co.uk",
    // Keep legal/advice destinations on the platform until their
    // installer-specific ownership and URLs are deliberately configured.
    privacy: null,
    estimateDisclaimer: null,
    advice: null,
  },

  assets: {
    // A real installer logo can be added without changing consuming UI.
    logo: null,
    heroImage: null,

    // Reserved for later hardware catalogue / installer imagery work.
    productImages: {},
  },

  // Runtime theme values use space-separated RGB channels so Tailwind
  // opacity modifiers such as bg-accent/10 continue to work.
  theme: {
    ...DEFAULT_THEME,
  },

  // Reserved for future controlled presets such as
  // "sleek-professional" or "fun-friendly".
  stylePreset: "default",

  accreditations: [],
};

export const TENANTS = {
  [ZION_ENERGY_TENANT.id]: ZION_ENERGY_TENANT,
};

export const DEFAULT_TENANT_ID = "zion-energy";

const configuredTenantId = String(
  process.env.REACT_APP_TENANT_ID || ""
).trim();

export const REQUESTED_TENANT_ID =
  configuredTenantId || DEFAULT_TENANT_ID;

export const ACTIVE_TENANT =
  TENANTS[REQUESTED_TENANT_ID] || null;

export const ACTIVE_TENANT_ID =
  ACTIVE_TENANT?.id || null;

// Compatibility alias for existing components.
// New tenant-aware code should prefer ACTIVE_TENANT.
export const INSTALLER = ACTIVE_TENANT;

if (configuredTenantId && !ACTIVE_TENANT) {
  console.warn(
    `[ZeyZer] Unknown REACT_APP_TENANT_ID "${configuredTenantId}". ` +
      "Using neutral ZeyZer platform branding instead."
  );
}

const PLATFORM_BRAND = {
  id: "zeyzer-solar",
  name: PLATFORM.toolName,
  shortName: PLATFORM.toolName,
  initials: "ZS",
  contact: {
    email: PLATFORM.contactEmail,
    phone: null,
  },
  urls: PLATFORM.urls,
  assets: {
    logo: null,
    heroImage: null,
    productImages: {},
  },
  theme: DEFAULT_THEME,
  stylePreset: "default",
  accreditations: [],
};

export const ACTIVE_BRAND = ACTIVE_TENANT || PLATFORM_BRAND;

export const ACTIVE_THEME = {
  ...DEFAULT_THEME,
  ...(ACTIVE_BRAND.theme || {}),
};

export const ACTIVE_THEME_STYLE = {
  "--theme-ink": ACTIVE_THEME.ink,
  "--theme-muted": ACTIVE_THEME.muted,
  "--theme-subtle": ACTIVE_THEME.subtle,
  "--theme-surface": ACTIVE_THEME.surface,
  "--theme-canvas": ACTIVE_THEME.canvas,
  "--theme-soft": ACTIVE_THEME.soft,
  "--theme-line": ACTIVE_THEME.line,
  "--theme-brand": ACTIVE_THEME.brand,
  "--theme-brand-soft": ACTIVE_THEME.brandSoft,
  "--theme-accent": ACTIVE_THEME.accent,
  "--theme-pop": ACTIVE_THEME.pop,
  "--theme-gentle": ACTIVE_THEME.gentle,
};

export const MARKETING_SITE_URL =
  ACTIVE_BRAND.urls?.website || PLATFORM.urls.website;

export const PRIVACY_POLICY_URL =
  ACTIVE_BRAND.urls?.privacy || PLATFORM.urls.privacy;

export const ESTIMATE_DISCLAIMER_URL =
  ACTIVE_BRAND.urls?.estimateDisclaimer || PLATFORM.urls.estimateDisclaimer;

export const ADVICE_URL =
  ACTIVE_BRAND.urls?.advice || PLATFORM.urls.advice;

export const ESTIMATE_DISCLAIMER_SHORT =
  "This is an estimate, not a final quote. Final pricing, system design and performance depend on survey, equipment selection, roof condition, grid connection and installer confirmation.";

export const CALCULATOR_STARTS_OPEN = true;

export const CONTACT_EMAIL =
  ACTIVE_BRAND.contact?.email || PLATFORM.contactEmail;
