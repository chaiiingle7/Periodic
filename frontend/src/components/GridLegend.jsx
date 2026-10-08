import React from "react";

function GridLegend() {
  return (
    <div className="tg-legend">
      <span className="tg-legend-swatch"><span className="tg-legend-box" style={{ background: "#f5f5f7", border: "1px solid var(--tg-line-soft)" }} /> Regular lecture</span>
      <span className="tg-legend-swatch"><span className="tg-legend-box" style={{ background: "linear-gradient(135deg,#eaf3ff,#dcebff)", borderLeft: "3px solid var(--tg-blue)" }} /> Lab session</span>
      <span className="tg-legend-swatch"><span className="tg-legend-box" style={{ background: "#eef6ff", border: "1px solid #b9dcff" }} /> Lab rotation (sub-batches)</span>
      <span className="tg-legend-swatch"><span className="tg-legend-box" style={{ background: "repeating-linear-gradient(135deg, #f5f5f7, #f5f5f7 4px, #ececee 4px, #ececee 8px)" }} /> Break</span>
    </div>
  );
}

export default GridLegend;
