import React from "react";

export default function QuoteContactCta({
  heading,
  description,
  buttonLabel,
  onClick,
  variant = "primary",
}) {
  return (
    <aside
      className={`quote-contact-cta quote-contact-cta--${variant} no-print`}
      aria-label={heading}
    >
      <div className="quote-contact-cta-copy">
        <h3>{heading}</h3>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className="quote-contact-cta-button"
        onClick={onClick}
      >
        <span>{buttonLabel}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 10h11M11 6l4 4-4 4" />
        </svg>
      </button>
    </aside>
  );
}
