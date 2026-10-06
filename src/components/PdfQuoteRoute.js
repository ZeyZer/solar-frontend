import React, { useEffect } from "react";

import QuotePage from "./QuotePage";

export default function PdfQuoteRoute({
  pdfQuote,
  pdfForm,
  pdfRoofs,
  pdfError,
  contactEmail,
}) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    window.__QUOTE_PDF_READY__ = false;

    if (!pdfQuote || !pdfForm || pdfError) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      window.__QUOTE_PDF_READY__ = true;
      window.__QUOTE_PDF_ERROR__ = "";
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pdfQuote, pdfForm, pdfError]);

  if (pdfError) {
    return (
      <div style={{ padding: 32 }}>
        <h1>Unable to load PDF quote</h1>
        <p>{pdfError}</p>
      </div>
    );
  }

  if (!pdfQuote || !pdfForm) {
    return (
      <div style={{ padding: 32 }}>
        Loading PDF quote...
      </div>
    );
  }

  return (
    <QuotePage
      quote={pdfQuote}
      form={pdfForm}
      roofs={pdfRoofs}
      pdfMode
      onEdit={() => {}}
      onBackToForm={() => {}}
      onDownloadPdf={() => {}}
      onUpdateQuote={() => {}}
      onOpenTariffModal={() => {}}
      contactEmail={contactEmail}
      updatedSections={[]}
      batteryRecommendationLifetimeYears={25}
      setBatteryRecommendationLifetimeYears={() => {}}
    />
  );
}
