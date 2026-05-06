import { useEffect } from "react";

export default function useAppPageEffects({
  isPdfRoute,
  page,
  setStarted,
  setPage,
}) {
  useEffect(() => {
    if (isPdfRoute) {
      console.log("Detected PDF quote route");
      setStarted(true);
      setPage("quote-pdf");
    }
  }, [isPdfRoute, setStarted, setPage]);

  useEffect(() => {
    if (page === "quote") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [page]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);
}