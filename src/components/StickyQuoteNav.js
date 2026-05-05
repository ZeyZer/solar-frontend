import React from "react";

export default function StickyQuoteNav({ updatedSections = [], onExit }) {
  const items = [
      { id: "system-choices", label: "System Choices" },
      { id: "performance", label: "Performance" },
      { id: "financials", label: "Financials" },
      { id: "optimisations", label: "Optimisations" },
      { id: "next-steps", label: "Next Steps" },
    ];
    return (
    <div className="sticky-quote-nav sticky top-0 z-30 border-b border-white bg-slate-50 backdrop-blur">
      <div className="container-app py-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
          
          {/* Left: back button */}
          <div className="flex items-center justify-center xl:justify-start">
              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center gap-2 rounded-xl bg-pop px-3 py-2 text-sm font-medium text-brand hover:bg-white hover:text-ink ring-1 ring-transparent hover:ring-line"
              >
                ← Back to Zeyzer Solar
              </button>
            </div>

            {/* Middle: section nav */}
            <div className="flex flex-wrap justify-center items-center gap-3">
              {items.map((item) => {
                const isUpdated = updatedSections.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      document.getElementById(item.id)?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
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

            {/* Right: logo / brand */}
            <div className="flex items-center justify-center xl:justify-end gap-2">
              <div className="h-8 w-8 rounded-xl bg-ink" />
              <div className="text-sm font-semibold text-ink">Zeyzer Solar</div>
            </div>
          </div>
        </div>
      </div>
    );
}
