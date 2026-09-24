import React, { useState } from "react";

export default function StickyQuoteNav({
  updatedSections = [],
  onExit,
}) {
  const [mobileExpanded, setMobileExpanded] =
    useState(false);

  const items = [
    {
      id: "system-choices",
      label: "System Choices",
      short: "S",
    },
    {
      id: "performance",
      label: "Performance",
      short: "P",
    },
    {
      id: "financials",
      label: "Financials",
      short: "F",
    },
    {
      id: "optimisations",
      label: "Optimisations",
      short: "O",
    },
    {
      id: "next-steps",
      label: "Next Steps",
      short: "N",
    },
  ];

  function jumpToSection(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="sticky-quote-nav sticky top-0 z-30 border-b border-white bg-slate-50 backdrop-blur">
      <div className="container-app py-3">
        {/* Desktop navigation */}
        <div className="sticky-quote-nav-desktop grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
          <div className="flex items-center justify-center xl:justify-start">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-2 rounded-xl bg-pop px-3 py-2 text-sm font-medium text-brand hover:bg-white hover:text-ink ring-1 ring-transparent hover:ring-line"
            >
              ← Back to Zeyzer Solar
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {items.map((item) => {
              const isUpdated =
                updatedSections.includes(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    jumpToSection(item.id)
                  }
                  className={
                    isUpdated
                      ? "rounded-full bg-emerald-100 px-4 py-1 mb-2 mt-2 text-body font-medium text-ink ring-1 ring-emerald-300 animate-pulse hover:bg-pop/80"
                      : "rounded-full bg-teal-200 px-4 py-1 mb-2 mt-2 text-body font-medium text-ink ring-1 ring-emerald-300 hover:bg-pop/80"
                  }
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2 xl:justify-end">
            <div className="h-8 w-8 rounded-xl bg-ink" />
            <div className="text-sm font-semibold text-ink">
              Zeyzer Solar
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="sticky-quote-nav-mobile">
          <div className="sticky-quote-nav-mobile-row">
            <button
              type="button"
              onClick={onExit}
              className="sticky-quote-nav-mobile-back"
              aria-label="Back to Zeyzer Solar"
            >
              ←
            </button>

            <div className="sticky-quote-nav-mobile-initials">
              {items.map((item) => {
                const isUpdated =
                  updatedSections.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      jumpToSection(item.id)
                    }
                    aria-label={item.label}
                    title={item.label}
                    className={`sticky-quote-nav-mobile-initial ${
                      isUpdated ? "is-updated" : ""
                    }`}
                  >
                    {item.short}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="sticky-quote-nav-mobile-toggle"
              onClick={() =>
                setMobileExpanded((value) => !value)
              }
              aria-expanded={mobileExpanded}
              aria-label={
                mobileExpanded
                  ? "Collapse quote navigation"
                  : "Expand quote navigation"
              }
            >
              {mobileExpanded ? "⌃" : "⌄"}
            </button>
          </div>

          {mobileExpanded && (
            <div className="sticky-quote-nav-mobile-expanded">
              {items.map((item) => {
                const isUpdated =
                  updatedSections.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      jumpToSection(item.id);
                      setMobileExpanded(false);
                    }}
                    className={`sticky-quote-nav-mobile-label ${
                      isUpdated ? "is-updated" : ""
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
