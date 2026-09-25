import React from "react";

import {
  PRIVACY_POLICY_URL,
  ESTIMATE_DISCLAIMER_URL,
} from "../config/siteConfig";

export default function SiteFooter({ platform, installer }) {
  return (
    <footer className="site-footer">
      {installer ? (
        <>
          Estimate provided by <strong>{installer.name}</strong>
          {" • "}
          Powered by {platform.toolName}
        </>
      ) : (
        <>
          <strong>{platform.toolName}</strong> estimate tool
          {" • "}
          Providing realistic solar estimates
        </>
      )}
      
      <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noreferrer"
          className="hover:text-accent"
        >
          Privacy Policy
        </a>

        <a
          href={ESTIMATE_DISCLAIMER_URL}
          target="_blank"
          rel="noreferrer"
          className="hover:text-accent"
        >
          Estimate Disclaimer
        </a>
      </div>
    </footer>
  );
}