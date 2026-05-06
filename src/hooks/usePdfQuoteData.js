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

  const isPdfRoute = hash.startsWith("#/quote-pdf");

  if (!isPdfRoute) {
    return {
      isPdfRoute: false,
      pdfId: "",
    };
  }

  const queryIndex = hash.indexOf("?");

  if (queryIndex === -1) {
    return {
      isPdfRoute: true,
      pdfId: "",
    };
  }

  const queryString = hash.slice(queryIndex + 1);
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