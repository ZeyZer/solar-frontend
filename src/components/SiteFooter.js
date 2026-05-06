import React from "react";

export default function SiteFooter({ platform, installer }) {
  return (
    <footer className="site-footer">
      {platform.toolName} estimate tool •{" "}
      {installer ? (
        <>
          Estimate provided by <strong>{installer.name}</strong>
        </>
      ) : (
        "Providing realistic Solar estimates - Connecting homeowners with installers"
      )}
    </footer>
  );
}