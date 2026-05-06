import React from "react";

import QuotePage from "./QuotePage";

export default function PdfQuoteRoute({
  pdfQuote,
  pdfForm,
  pdfRoofs,
  pdfError,
  contactEmail,
}) {
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