import React, { createContext, useContext, useEffect, useRef } from "react";
import { loadLiquidGlass, getContainerClass } from "../utils/liquidGlass";

// Lets the whole app switch the WebGL glass on/off (it samples the page with
// html2canvas, which is the heavy part).
export const GlassContext = createContext(true);

// A decorative layer that sits BEHIND its parent's real content. The parent
// must be position: relative/sticky. All text and buttons stay ordinary DOM
// on top, so readability and clicks never depend on the library.
function GlassLayer({ radius = 20, type = "rounded", tint = 0.12 }) {
  const host = useRef(null);
  const enabled = useContext(GlassContext);

  useEffect(() => {
    if (!enabled || !host.current) return undefined;
    let cancelled = false;
    let container = null;
    let observer = null;

    loadLiquidGlass().then((ok) => {
      if (cancelled || !ok || !host.current) return;
      const Container = getContainerClass();
      if (!Container) return;
      try {
        container = new Container({ borderRadius: radius, type, tintOpacity: tint });
        host.current.appendChild(container.element);
        const sync = () => { try { container.updateSizeFromDOM(); } catch (_) { /* ignore */ } };
        observer = new ResizeObserver(sync);
        observer.observe(host.current);
        sync();
      } catch (e) {
        console.warn("Liquid glass layer unavailable, using CSS glass instead:", e);
      }
    });

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (container) {
        try {
          const list = getContainerClass()?.instances;
          const i = list ? list.indexOf(container) : -1;
          if (i >= 0) list.splice(i, 1);
          container.element?.remove();
        } catch (_) { /* ignore */ }
      }
    };
  }, [enabled, radius, type, tint]);

  return <div ref={host} className="tg-glass-layer" aria-hidden="true" />;
}

export default GlassLayer;
