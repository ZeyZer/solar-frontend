/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // ---- COLORS (semantic tokens) ----
      colors: {
        ink: "#20163c",        // main text (slate-900)
        muted: "#2f54c6",      // secondary text (slate-500)
        subtle: "#94a3b8",     // tertiary text (slate-400)

        surface: "#ffffff",    // cards / surfaces
        canvas: "#f8fafc",     // page background (slate-50)
        soft: "#f1f5f9",       // soft panels (slate-100)

        line: "#e2e8f0",       // borders (slate-200)

        brand: "#20163c",      // keep brand neutral for now (same as ink)
        brandSoft: "#ebebeb",
        accent: "#2563eb",
        pop: "#D9E021",
        gentle: "#059e94",
        test: "#48BEFF",
        green: "#96F7E4"
      },

      // ---- TYPOGRAPHY (semantic sizes) ----
      fontSize: {
        // Headings
        h4: ["5.55rem", { lineHeight: "5.75rem", fontWeight: "650" }],
        PDF: ["4.05rem", { lineHeight: "4.25rem", fontWeight: "650" }],
        h1: ["2.25rem", { lineHeight: "2.75rem", fontWeight: "650" }], // ~36px
        h2: ["1.5rem", { lineHeight: "2.0rem", fontWeight: "650" }],   // ~24px
        h3: ["1.225rem", { lineHeight: "1.75rem", fontWeight: "650" }],// ~18px

        // Body
        body: ["0.95rem", { lineHeight: "1.6rem" }],                  // ~15px
        small: ["0.8rem", { lineHeight: "1.35rem" }],                 // ~13px
        micro: ["0.72rem", { lineHeight: "1.15rem" }],                // ~11.5px

        // Stats
        stat: ["1.125rem", { lineHeight: "1.5rem", fontWeight: "650" }], // ~18px
        statLg: ["1.5rem", { lineHeight: "1.9rem", fontWeight: "700" }], // ~24px
      },

      // ---- RADIUS ----
      borderRadius: {
        card: "1rem",    // 16px
        pill: "9999px",

      },

      // ---- SHADOWS ----
      boxShadow: {
        card: "0 1px 0 rgba(15, 23, 42, 0.04), 0 12px 30px rgba(15, 23, 42, 0.06)",
        soft: "0 1px 0 rgba(15, 23, 42, 0.04)",
        bubble: "0px 2px 0 rgba(15, 23, 42, 0.04), 0 12px 30px rgba(15, 23, 42, 0.06)",
      },

      // ---- SPACING (optional, but handy) ----
      spacing: {
        section: "2.5rem",  // 40px
      },
    },
  },
  plugins: [],
};
