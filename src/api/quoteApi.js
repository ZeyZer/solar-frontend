export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://solar-backend-vp7n.onrender.com"; // http://localhost:4000 or https://solar-backend-vp7n.onrender.com

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

export async function getPdfQuoteData(pdfId) {
  const query = pdfId ? `?id=${encodeURIComponent(pdfId)}` : "";

  const resp = await fetch(`${API_BASE}/api/quote/pdf-data${query}`);

  if (!resp.ok) {
    const message = await readErrorResponse(
      resp,
      "Failed to load PDF quote data."
    );
    throw new Error(message);
  }

  return resp.json();
}

function getLeadIdFromPayload(payload = {}) {
  return (
    payload.leadId ||
    payload.quote?.leadId ||
    payload.input?.leadId ||
    payload.form?.leadId ||
    ""
  );
}

function withExplicitLeadId(payload = {}) {
  const leadId = getLeadIdFromPayload(payload);

  return {
    ...payload,
    leadId,

    quote: payload.quote
      ? {
          ...payload.quote,
          leadId: payload.quote.leadId || leadId,
        }
      : payload.quote,

    input: payload.input
      ? {
          ...payload.input,
          leadId: payload.input.leadId || leadId,
        }
      : payload.input,

    form: payload.form
      ? {
          ...payload.form,
          leadId: payload.form.leadId || leadId,
        }
      : payload.form,
  };
}

export async function requestQuotePdfBlob({ quote, form, roofs }) {
  const payload = withExplicitLeadId({
    leadId: quote?.leadId || form?.leadId || "",
    quote,
    form,
    roofs,
  });

  const resp = await fetch(`${API_BASE}/api/quote/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
    withExplicitLeadId(payload),
    "Failed to send email quote."
  );
}

export async function requestCallLead(payload) {
  return postJson(
    "/api/lead/request-call",
    withExplicitLeadId(payload),
    "Failed to request a call."
  );
}