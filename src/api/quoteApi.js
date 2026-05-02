export const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:4000"; // http://localhost:4000 or https://solar-backend-vp7n.onrender.com

async function readErrorResponse(resp, fallbackMessage) {
  try {
    const text = await resp.text();
    return text || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function postJson(path, payload, fallbackMessage) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const message = await readErrorResponse(resp, fallbackMessage);
    throw new Error(message);
  }

  return resp.json();
}

export async function generateQuote(payload) {
  return postJson(
    "/api/quote",
    payload,
    "Failed to generate quote."
  );
}

export async function recalculateQuote(payload) {
  return postJson(
    "/api/quote/recalc",
    payload,
    "Failed to recalculate quote."
  );
}

export async function getPdfQuoteData() {
  const resp = await fetch(`${API_BASE}/api/quote/pdf-data`);

  if (!resp.ok) {
    const message = await readErrorResponse(
      resp,
      "Failed to load PDF quote data."
    );
    throw new Error(message);
  }

  return resp.json();
}

export async function requestQuotePdfBlob({ quote, form, roofs }) {
  const resp = await fetch(`${API_BASE}/api/quote/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quote,
      form,
      roofs,
    }),
  });

  if (!resp.ok) {
    const message = await readErrorResponse(
      resp,
      `PDF request failed: ${resp.status}`
    );
    throw new Error(message);
  }

  return resp.blob();
}

export function downloadBlob(blob, filename = "solar-quote.pdf") {
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

export async function downloadQuotePdf({ quote, form, roofs }) {
  const blob = await requestQuotePdfBlob({
    quote,
    form,
    roofs,
  });

  downloadBlob(blob, "solar-quote.pdf");
}

export async function emailQuoteLead(payload) {
  return postJson(
    "/api/lead/email-quote",
    payload,
    "Failed to send email quote."
  );
}

export async function requestCallLead(payload) {
  return postJson(
    "/api/lead/request-call",
    payload,
    "Failed to request a call."
  );
}