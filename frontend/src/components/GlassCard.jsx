import React from "react";
import GlassLayer from "./GlassLayer";
import { GLASS_TUNING } from "../utils/liquidGlass";

// A frosted "liquid glass" panel. Layers (back to front): CSS frosted glass ->
// WebGL refraction (when available) -> a light scrim that guarantees text
// contrast -> the content.
function GlassCard({ children, className = "", style }) {
  return (
    <div className={`tg-glass-card ${className}`} style={style}>
      <GlassLayer radius={22} type="rounded" tint={GLASS_TUNING.cardTint} />
      <div className="tg-glass-scrim" />
      <div className="tg-glass-content">{children}</div>
    </div>
  );
}

export default GlassCard;
