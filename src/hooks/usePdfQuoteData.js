import { useEffect, useState } from "react";

import {
  getPdfQuoteData,
} from "../api/quoteApi";

export default function usePdfQuoteData() {
  const [pdfQuote, setPdfQuote] = useState(null);
  const [pdfForm, setPdfForm] = useState(null);
  const [pdfRoofs, setPdfRoofs] = useState([]);
  const [pdfError, setPdfError] = useState("");

  const isPdfRoute =
    typeof window !== "undefined" &&
    window.location.hash === "#/quote-pdf";

  useEffect(() => {
    if (!isPdfRoute) return;

    let cancelled = false;

    async function loadPdfData() {
      try {
        setPdfError("");

        const data = await getPdfQuoteData();

        if (cancelled) return;

        setPdfQuote(data.quote || null);
        setPdfForm(data.form || null);
        setPdfRoofs(data.roofs || []);
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to load PDF quote data:", err);
        setPdfError(err?.message || "Failed to load PDF quote data.");
      }
    }

    loadPdfData();

    return () => {
      cancelled = true;
    };
  }, [isPdfRoute]);

  return {
    isPdfRoute,
    pdfQuote,
    pdfForm,
    pdfRoofs,
    pdfError,
  };
}