import React from "react";

export default function LandingPage({
  platform,
  installer,
  onStartEstimate,
}) {
  return (
    <section className="landing-hero">
      <div className="landing-hero-inner">
        <div className="landing-hero-tags">
          <span className="landing-tag">Under 60 seconds</span>
          <span className="landing-tag">No obligation estimate</span>
          <span className="landing-tag">5 Star Trusted Trader</span>
        </div>

        <div className="landing-hero-main">
          <div className="landing-hero-left">
            <h1 className="landing-title">
              Instant Solar Estimate
              <span>For Your Home</span>
            </h1>

            <p className="landing-subtitle">
              See what solar &amp; battery could save you!
            </p>

            <div className="landing-cta-row">
              <button
                type="button"
                className="landing-cta-button"
                onClick={onStartEstimate}
              >
                Start my estimate
                <span className="landing-cta-arrow">➜</span>
              </button>

              <p className="landing-cta-note">
                Answer a few quick questions to see a tailored system, price range,
                savings and simple payback.
                <br />
                <span className="landing-no-sales">No sales calls.</span>
              </p>
            </div>
          </div>

          <div className="landing-hero-right">
            <img
              src="/solar-hero.png"
              alt="Solar panels, sun and savings illustration"
              className="landing-hero-image"
            />
          </div>
        </div>
      </div>

      <div className="landing-brand-bar">
        <div className="landing-brand-inner">
          <div className="landing-brand-left">
            <div className="brand-logo-circle">ZE</div>

            <div className="brand-text">
              {installer ? (
                <>
                  Estimate provided by <strong>{installer.name}</strong> via{" "}
                  <strong>{platform.toolName}</strong>
                </>
              ) : (
                <>
                  <strong>{platform.toolName}</strong> connects you with local installers
                </>
              )}
            </div>
          </div>

          {installer?.accreditations?.length ? (
            <div className="landing-brand-badges">
              {installer.accreditations.map((b) => (
                <span key={b} className="brand-pill">
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}