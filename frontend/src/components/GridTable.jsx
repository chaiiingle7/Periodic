import React from "react";
import { Beaker } from "lucide-react";
import { getPeriodsForDay, timeLabelForPeriod } from "../utils/helpers";

function GridTable({ config, rowsResolver }) {
  // rowsResolver(day, period) => null | {title, sub, isLab}
  const breakByAfter = {};
  config.breaks.forEach((b) => (breakByAfter[b.afterPeriod] = b));
  const maxPeriods = Math.max(config.periodsPerDay, ...config.days.map((d) => getPeriodsForDay(config, d)));

  const columns = [];
  for (let p = 1; p <= maxPeriods; p++) {
    columns.push({ type: "period", period: p });
    if (breakByAfter[p]) columns.push({ type: "break", brk: breakByAfter[p], afterPeriod: p });
  }

  return (
    <div className="tg-table-wrap">
      <table className="tg-table">
        <thead>
          <tr>
            <th>Day</th>
            {columns.map((c, i) => c.type === "period"
              ? <th key={i}>P{c.period} <div style={{ fontWeight: 400 }}>{timeLabelForPeriod(config, c.period)}</div></th>
              : <th key={i} style={{ color: "var(--tg-ink-soft)" }}>{c.brk.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {config.days.map((day) => {
            const periodsThisDay = getPeriodsForDay(config, day);
            const isHalfDay = periodsThisDay < config.periodsPerDay;
            return (
              <tr key={day}>
                <td style={{ fontWeight: 600 }}>
                  {day}
                  {isHalfDay && <div className="tg-badge tg-badge-blue" style={{ marginTop: 4 }}>{periodsThisDay}p day</div>}
                </td>
                {columns.map((c, i) => {
                  if (c.type === "break") {
                    if (c.afterPeriod >= periodsThisDay) return <td key={i}><div className="tg-cell tg-empty" style={{ border: "none" }} /></td>;
                    return <td key={i}><div className="tg-cell tg-break">{c.brk.duration}m</div></td>;
                  }
                  if (c.period > periodsThisDay) return <td key={i}><div className="tg-cell tg-empty" style={{ border: "none" }} /></td>;
                  const cell = rowsResolver(day, c.period);
                  if (!cell) return <td key={i}><div className="tg-cell tg-empty" /></td>;
                  if (cell.isRotation) {
                    return (
                      <td key={i}>
                        <div className="tg-cell tg-rotation">
                          <span className="tg-lab-chip"><Beaker size={9} /> Lab rotation</span>
                          {cell.rows.map((r, ri) => (
                            <div className="tg-rotation-row" key={ri}>
                              <span className="tg-rotation-dot" style={{ background: r.color }} />
                              <span style={{ fontWeight: 700 }}>{r.label}</span>
                              <span style={{ color: "var(--tg-ink-soft)" }}>·</span>
                              <span>{r.title}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={i}>
                      <div className={`tg-cell ${cell.isLab ? "tg-lab" : ""}`}>
                        {cell.isLab && <div className="tg-lab-chip"><Beaker size={9} /> Lab</div>}
                        <div className="tg-cell-title">{cell.title}</div>
                        <div className="tg-cell-sub">{cell.sub}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default GridTable;
