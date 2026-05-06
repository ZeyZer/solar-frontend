import {
  downloadQuotePdf,
} from "../api/quoteApi";

export default function useQuotePdfDownload({
  quote,
  form,
  roofs,
}) {
  async function handleDownloadPdf() {
    try {
      await downloadQuotePdf({
        quote,
        form,
        roofs,
      });
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert(`Sorry, the PDF could not be generated.\n\n${err.message}`);
    }
  }

  return {
    handleDownloadPdf,
  };
}