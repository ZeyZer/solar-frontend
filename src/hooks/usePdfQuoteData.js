import { useEffect, useMemo, useState } from "react";

import {
  getPdfQuoteData,
} from "../api/quoteApi";

function getPdfRouteInfo() {
  if (typeof window === "undefined") {
    return {
      isPdfRoute: false,
      pdfId: "",
    };
  }

  const hash = window.location.hash || "";

  if (!hash.startsWith("#/quote-pdf")) {
    return {
      isPdfRoute: false,
      pdfId: "",
    };
  }

  const queryIndex = hash.indexOf("?");
  const queryString = queryIndex >= 0 ? hash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(queryString);

  return {
    isPdfRoute: true,
    pdfId: params.get("id") || "",
  };
}

export default function usePdfQuoteData() {
  const [pdfQuote, setPdfQuote] = useState(null);
  const [pdfForm, setPdfForm] = useState(null);
  const [pdfRoofs, setPdfRoofs] = useState([]);
  const [pdfError, setPdfError] = useState("");

  const {
    isPdfRoute,
    pdfId,
  } = useMemo(() => getPdfRouteInfo(), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__QUOTE_PDF_READY__ = false;
      window.__QUOTE_PDF_ERROR__ = "";
    }

    if (!isPdfRoute) return;

    let cancelled = false;

    async function loadPdfData() {
      try {
        setPdfError("");

        if (!pdfId) {
          throw new Error("Missing PDF ID.");
        }

        const data = await getPdfQuoteData(pdfId);

        if (cancelled) return;

        setPdfQuote(data.quote || null);
        setPdfForm(data.form || null);
        setPdfRoofs(data.roofs || []);

        if (typeof window !== "undefined") {
          window.__QUOTE_PDF_READY__ = true;
          window.__QUOTE_PDF_ERROR__ = "";
        }
      } catch (err) {
        if (cancelled) return;

        const message = err?.message || "Failed to load PDF quote data.";

        console.error("Failed to load PDF quote data:", err);
        setPdfError(message);

        if (typeof window !== "undefined") {
          window.__QUOTE_PDF_READY__ = false;
          window.__QUOTE_PDF_ERROR__ = message;
        }
      }
    }

    loadPdfData();

    return () => {
      cancelled = true;
    };
  }, [isPdfRoute, pdfId]);

  return {
    isPdfRoute,
    pdfId,
    pdfQuote,
    pdfForm,
    pdfRoofs,
    pdfError,
  };
}