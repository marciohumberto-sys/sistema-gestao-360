import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Tenta rolar o window
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Tenta rolar o container principal se ele gerenciar o overflow
    const mainScroll = document.querySelector("[data-main-scroll]");
    if (mainScroll) {
      mainScroll.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}

export default ScrollToTop;
