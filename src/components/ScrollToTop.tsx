import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the top of the page on every route (pathname) change.
 * Ignores hash changes so in-page anchor links keep their smooth scroll.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
