import React from "react";

import {
  PRIVACY_POLICY_URL,
  ESTIMATE_DISCLAIMER_URL,
  ESTIMATE_DISCLAIMER_SHORT,
} from "../config/siteConfig";

export default function LegalNotice({
  variant = "compact",
  className = "",
}) {
  const isCompact = variant === "compact";

  return (
    <div
      className={[
        isCompact
          ? "rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600"
          : "rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600",
        className,
      ].join(" ")}
    >
      <p>
        {ESTIMATE_DISCLAIMER_SHORT}
      </p>

      <p className={isCompact ? "mt-1" : "mt-2"}>
        By using this calculator, you agree that Zeyzer Solar may use the
        information you provide to calculate your estimate, save your quote and
        contact you if you request a follow-up. We DO NOT sell your data.
      </p>

      <p className={isCompact ? "mt-1" : "mt-2"}>
        See our{" "}
        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-accent underline underline-offset-2"
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a
          href={ESTIMATE_DISCLAIMER_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-accent underline underline-offset-2"
        >
          Estimate Disclaimer
        </a>
        .
      </p>
    </div>
  );
}