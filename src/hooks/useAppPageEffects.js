import { useEffect } from "react";

export default function useAppPageEffects({ page }) {
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