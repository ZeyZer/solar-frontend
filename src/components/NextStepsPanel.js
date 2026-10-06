import React, { useState } from "react";
import SectionHeader from "../ui/SectionHeader.js";
import Card from "../ui/Card.js";
import LegalNotice from "./LegalNotice";
import { ACTIVE_BRAND } from "../config/siteConfig";

export default function NextStepsPanel({ quote, onEmailQuote, onRequestCall, infoUrl, onDownloadPdf, initialName, initialEmail, initialPhone }) {
  const brandName = ACTIVE_BRAND.name;

  const [name, setName] = useState(initialName || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [phone, setPhone] = useState(initialPhone || "");

  const [emailStatus, setEmailStatus] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [callSubmitting, setCallSubmitting] = useState(false);
  const [emailAccepted, setEmailAccepted] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);

  const [marketingConsent, setMarketingConsent] = useState(false);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (emailSubmitting || emailAccepted) return;

    setEmailSubmitting(true);
    setEmailStatus("Sending…");
    try {
      await onEmailQuote({ name, email, marketingConsent });
      setEmailAccepted(true);
      setEmailStatus("✅ Request received. We’re preparing your PDF and will email it to you shortly.");
    } catch (err) {
      setEmailStatus("❌ We couldn’t receive your request. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function handleCallSubmit(e) {
    e.preventDefault();
    if (callSubmitting || callAccepted) return;

    setCallSubmitting(true);
    setCallStatus("Sending…");
    try {
      await onRequestCall({ name, email, phone, marketingConsent });
      setCallAccepted(true);
      setCallStatus("✅ Call request received. We’ll be in touch soon. We’re also preparing your quote and will email it shortly.");
    } catch (err) {
      setCallStatus("❌ We couldn’t receive your call request. Please try again.");
    } finally {
      setCallSubmitting(false);
    }
  }

  return (
    <section className="next-steps-panel mt-10">
      <SectionHeader
        title="Next Steps"
        description={`Choose what you’d like to do next. We can email your quote, arrange a call with ${brandName}, or point you to useful guides.`}
        action={
          <button
            onClick={onDownloadPdf}
            className="next-steps-primary rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Download PDF Quote
          </button>
        }
      />
      {/* Badge row (subtle polish) */}
      <div className="next-steps-badges mt-4 mb-8 flex items-center gap-2">
        <span className="rounded-full bg-accent px-3 py-2 text-xs font-medium text-white">
          Store Your Quote
        </span>
        <span className="rounded-full bg-accent px-3 py-2 text-xs font-medium text-white">
          Talk to {brandName}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Card 1: Email my quote */}
        <Card title="Email my quote">
          <p className="text-sm text-slate-600">
            Get a copy of your estimate by email. You’ll receive your quote summary and next steps.
          </p>

          <form className="mt-4 space-y-3" onSubmit={handleEmailSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-600">Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>

            <label className="flex items-start mt-4 gap-2 text-micro text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />
              <span>
                I’m happy to receive occasional emails about solar news, quote tool improvements
                and related guidance. <p>You can unsubscribe at any time.</p>
              </span>
            </label>

            <button
              type="submit"
              disabled={emailSubmitting || emailAccepted}
              className="next-steps-primary mt-2 w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {emailSubmitting ? "Sending…" : "Email my quote"}
            </button>

            {emailStatus && <p className="text-xs text-slate-500">{emailStatus}</p>}
          </form>
        </Card>

        {/* Card 2: Talk to an installer */}
        <Card title={`Talk to ${brandName}`}>
          <p className="text-sm text-slate-600">
            Ask questions, confirm suitability, and take the next step with {brandName}. We’ll also email your quote for reference.
          </p>

          <form className="mt-4 space-y-3" onSubmit={handleCallSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-600">Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Phone</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07..."
                type="tel"
                required
              />
            </div>

            <label className="flex items-start mt-4 gap-2 text-micro text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />
              <span>
                I’m happy to receive occasional emails about solar news, quote tool improvements
                and related guidance. <p>You can unsubscribe at any time.</p>
              </span>
            </label>

            <button
              type="submit"
              disabled={callSubmitting || callAccepted}
              className="next-steps-primary mt-2 w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {callSubmitting ? "Sending…" : "Request a call"}
            </button>

            {callStatus && <p className="text-xs text-slate-500">{callStatus}</p>}
          </form>
        </Card>

        {/* Card 3: Learn more */}
        <Card title="Learn more about solar">
          <p className="text-sm text-slate-600">
            Read quick guides on solar, batteries, SEG payments, and how we estimate savings.
          </p>

          <div className="mt-4">
            <a href={infoUrl} className="block">
              <button
                type="button"
                className="next-steps-secondary w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Visit information centre
              </button>
            </a>

            <p className="mt-3 text-xs text-slate-500">
              Tip: Use this to build confidence before booking a call.
            </p>
          </div>
        </Card>
      </div>

      <LegalNotice
        variant="compact"
        className={"mt-4"}
      />

      <p className="mt-2 mb-6 text-xs text-slate-500">
        Self-consumption model:{" "}
        <strong className="text-slate-900">{quote?.selfConsumptionModel}</strong>
      </p>
    </section>
  );
}
