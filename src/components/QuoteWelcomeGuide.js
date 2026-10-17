import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ACTIVE_BRAND,
  ACTIVE_THEME_STYLE,
  getBrandLogo,
} from "../config/siteConfig";

const GUIDE_ITEMS = [
  {
    title: "System Choices",
    description: "The panels, battery and extras included in your estimate.",
    icon: "home",
  },
  {
    title: "Performance",
    description: "How much solar electricity your home could produce and use.",
    icon: "sun",
  },
  {
    title: "Financials",
    description: "Your potential savings and how long the system may take to pay for itself.",
    icon: "wallet",
  },
  {
    title: "Optimisations",
    description: "Try different tariffs and battery sizes to find what works for you.",
    icon: "sliders",
  },
  {
    title: "Next Steps",
    description: "Email your quote or speak to the Zion Energy team.",
    icon: "message",
  },
];

function GuideIcon({ name }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (name === "home") {
    return (
      <svg {...commonProps}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13v-9.5" />
        <path d="m8 12 2-3h4l2 3H8Z" />
      </svg>
    );
  }

  if (name === "sun") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg {...commonProps}>
        <path d="M4 6.5h14a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h12" />
        <path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" />
        <path d="M11.5 9.5c0-1.1-.78-2-1.75-2S8 8.4 8 9.5v5" />
        <path d="M7 12h4" />
      </svg>
    );
  }

  if (name === "sliders") {
    return (
      <svg {...commonProps}>
        <path d="M4 6h5M15 6h5M4 12h9M17 12h3M4 18h2M12 18h8" />
        <circle cx="12" cy="6" r="2" />
        <circle cx="15" cy="12" r="2" />
        <circle cx="9" cy="18" r="2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-3a3 3 0 0 1-2-3V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8Z" />
      <path d="M7 9h10M7 13h6" />
    </svg>
  );
}

export default function QuoteWelcomeGuide({ open, onClose, returnFocusRef }) {
  const dialogRef = useRef(null);
  const primaryButtonRef = useRef(null);
  const brandLogo = getBrandLogo(ACTIVE_BRAND, "light");

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const focusReturnRef = returnFocusRef;
    const root = document.getElementById("root");
    const previousOverflow = document.body.style.overflow;
    const previousAriaHidden = root?.getAttribute("aria-hidden");
    const previousInert = root?.inert;

    // The portal has committed before this effect runs, so move focus into it
    // before making the application root unavailable to assistive technology.
    primaryButtonRef.current?.focus();

    document.body.style.overflow = "hidden";
    if (root) {
      root.inert = true;
      root.setAttribute("aria-hidden", "true");
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(focusableElements || []);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      if (root) {
        root.inert = previousInert;
        if (previousAriaHidden === null) {
          root.removeAttribute("aria-hidden");
        } else {
          root.setAttribute("aria-hidden", previousAriaHidden);
        }
      }

      function canRestoreFocus(element) {
        if (!(element instanceof HTMLElement) || !element.isConnected) {
          return false;
        }

        if (
          element === document.body ||
          element.matches(':disabled, [aria-hidden="true"]') ||
          element.getClientRects().length === 0
        ) {
          return false;
        }

        return element.tabIndex >= 0;
      }

      const currentReturnFocus = focusReturnRef?.current;
      const focusTarget = canRestoreFocus(previousFocus)
        ? previousFocus
        : canRestoreFocus(currentReturnFocus)
          ? currentReturnFocus
          : null;
      focusTarget?.focus();
    };
  }, [onClose, open, returnFocusRef]);

  if (!open) return null;

  return createPortal(
    <div
      className="quote-welcome-guide-overlay no-print"
      data-style-preset={ACTIVE_BRAND.stylePreset}
      style={ACTIVE_THEME_STYLE}
    >
      <div
        ref={dialogRef}
        className="quote-welcome-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-welcome-guide-title"
        tabIndex="-1"
      >
        <button
          type="button"
          className="quote-welcome-guide-close"
          onClick={onClose}
          aria-label="Close quote guide"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        {brandLogo && (
          <div className="quote-welcome-guide-brand">
            <img
              src={brandLogo}
              alt={`${ACTIVE_BRAND.name} logo`}
              className="quote-welcome-guide-brand-logo"
            />
          </div>
        )}

        <div className="quote-welcome-guide-heading">
          <h2 id="quote-welcome-guide-title">Your solar quote, explained</h2>
          <p>
            Your quote has five sections. Here's where to find the information
            that's most useful to you.
          </p>
        </div>

        <ol className="quote-welcome-guide-grid">
          {GUIDE_ITEMS.map((item) => (
            <li key={item.title} className="quote-welcome-guide-item">
              <span className="quote-welcome-guide-icon">
                <GuideIcon name={item.icon} />
              </span>
              <span className="quote-welcome-guide-copy">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="quote-welcome-guide-reassurance">
          Don't worry if you're not sure about everything. We're here to help.
        </p>

        <button
          ref={primaryButtonRef}
          type="button"
          className="quote-welcome-guide-primary"
          onClick={onClose}
        >
          Explore my quote
        </button>
      </div>
    </div>,
    document.body
  );
}
