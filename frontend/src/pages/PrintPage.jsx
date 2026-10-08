import React, { useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import Field from "../components/Field";
import { getPeriodsForDay, timeLabelForPeriod, subBatchLabel } from "../utils/helpers";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];

// The printable timetable: grid (lab blocks merged), sub-batches, faculty and
// subject short/long forms, and three blank signature lines. No classroom
// numbers. Use the Print button, then choose "Save as PDF" if you want a file.
function PrintPage({ config, schedule, onBack }) {
  const [batchId, setBatchId] = useState(config.batches[0]?.id);
  const [department, setDepartment] = useState("");
  const [classTeacher, setClassTeacher] = useState("");
  const [wef, setWef] = useState("");
  const [rolls, setRolls] = useState({});

  const batch = config.batches.find((b) => b.id === batchId);
  const teacherById = useMemo(() => Object.fromEntries(config.teachers.map((t) => [t.id, t])), [config.teachers]);
  const tAbbr = (id) => teacherById[id]?.abbr || teacherById[id]?.name || "—";
  const sAbbr = (c) => c.subjectAbbr || c.subjectName;

  if (!batch || !schedule) return null;

  const slots = schedule.batchSlot[batchId] || {};
  const breakByAfter = {};
  config.breaks.forEach((b) => (breakByAfter[b.afterPeriod] = b));
  const maxPeriods = Math.max(config.periodsPerDay, ...config.days.map((d) => getPeriodsForDay(config, d)));
  const columns = [];
  for (let p = 1; p <= maxPeriods; p++) {
    columns.push({ type: "period", period: p });
    if (breakByAfter[p] && p < maxPeriods) columns.push({ type: "break", brk: breakByAfter[p] });
  }

  const signature = (c) =>
    c.isRotation
      ? "R:" + c.assignments.map((a) => `${a.subBatchIndex}.${a.subjectId}.${a.teacherId}`).join(",")
      : `L:${c.subjectId}.${c.teacherId}.${c.subBatchIndex ?? ""}`;

  const cellLines = (c) =>
    c.isRotation
      ? c.assignments.map((a) => `${a.subjectAbbr || a.subjectName}-${subBatchLabel(a.subBatchIndex)} (${tAbbr(a.teacherId)})`)
      : [`${sAbbr(c)} (${tAbbr(c.teacherId)})`];

  const renderDay = (day, dayIndex) => {
    const P = getPeriodsForDay(config, day);
    const tds = [];
    let skip = 0;
    columns.forEach((c, ci) => {
      if (skip > 0) { skip--; return; }
      if (c.type === "break") {
        if (dayIndex === 0) {
          tds.push(
            <td key={`b${ci}`} rowSpan={config.days.length} className="tg-print-break">
              <div className="tg-print-vertical">{c.brk.label}</div>
            </td>
          );
        }
        return;
      }
      if (c.period > P) { tds.push(<td key={ci} />); return; }
      const cell = slots[day]?.[c.period];
      if (!cell) { tds.push(<td key={ci} />); return; }
      let span = 1;
      if (cell.isLab || cell.isRotation) {
        const sig = signature(cell);
        let n = ci + 1;
        while (span < (config.labBlockSize || 2)) {
          const nc = columns[n];
          if (!nc || nc.type !== "period" || nc.period > P) break;
          const nx = slots[day]?.[nc.period];
          if (!nx || signature(nx) !== sig) break;
          span++; n++;
        }
      }
      skip = span - 1;
      tds.push(
        <td key={ci} colSpan={span}>
          {cellLines(cell).map((l, i) => <div key={i}>{l}</div>)}
        </td>
      );
    });
    return tds;
  };

  // legends (only what this class actually uses)
  const subs = batch.subjects || [];
  const teacherIds = [...new Set(subs.map((s) => s.teacherId).filter(Boolean))];
  const faculty = teacherIds.map((id) => teacherById[id]).filter(Boolean).sort((a, b) => (a.abbr || a.name).localeCompare(b.abbr || b.name));
  const uniq = (list) => { const seen = new Set(); return list.filter((s) => { const k = (s.abbr || s.name) + "|" + s.name; if (seen.has(k)) return false; seen.add(k); return true; }); };
  const lectures = uniq(subs.filter((s) => !s.isLab));
  const labs = uniq(subs.filter((s) => s.isLab));
  const subBatchCount = (batch.subBatches || 0) > 1 ? batch.subBatches : 0;

  return (
    <div className="tg-container tg-print-wrap" style={{ padding: "32px 24px 80px" }}>
      <div className="no-print" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={onBack}><ArrowLeft size={14} /> Back to timetables</button>
          <button className="tg-btn tg-btn-primary tg-btn-sm" onClick={() => window.print()}><Printer size={14} /> Print / Save as PDF</button>
        </div>
        <div className="tg-card">
          <div className="tg-section-title" style={{ fontSize: 18 }}>Printable timetable</div>
          <div className="tg-section-sub">Fill in the details that appear in the header, then print. Tip: in the print dialog choose "Save as PDF" and landscape.</div>
          <div className="tg-row tg-grid-4">
            <Field label="Class / batch">
              <select className="tg-select" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                {config.batches.map((b) => <option key={b.id} value={b.id}>{b.name || "Unnamed batch"}</option>)}
              </select>
            </Field>
            <Field label="Department"><input className="tg-input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Information Technology" /></Field>
            <Field label="Class teacher"><input className="tg-input" value={classTeacher} onChange={(e) => setClassTeacher(e.target.value)} placeholder="Ms. Trupti T. Tekale" /></Field>
            <Field label="Effective from (w.e.f.)"><input className="tg-input" value={wef} onChange={(e) => setWef(e.target.value)} placeholder="10/08/2026" /></Field>
          </div>
          {subBatchCount > 0 && (
            <div className="tg-row tg-grid-4">
              {Array.from({ length: subBatchCount }, (_, i) => (
                <Field key={i} label={`Roll numbers — ${subBatchLabel(i)}`}>
                  <input className="tg-input" value={rolls[i] || ""} onChange={(e) => setRolls((r) => ({ ...r, [i]: e.target.value }))} placeholder="0001–0020" />
                </Field>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="tg-sheet">
        <div className="tg-sheet-head">
          <div><strong>{batch.name}</strong>{department && <> · Department of {department}</>}</div>
          <div>{classTeacher && <>Class Teacher: <strong>{classTeacher}</strong></>}{wef && <> &nbsp;·&nbsp; w.e.f. {wef}</>}</div>
        </div>

        <table className="tg-sheet-table">
          <thead>
            <tr>
              <th>Day \ Time</th>
              {columns.map((c, i) => c.type === "period"
                ? <th key={i}>{ROMAN[c.period - 1]}<div className="tg-sheet-time">{timeLabelForPeriod(config, c.period)}</div></th>
                : null)}
            </tr>
          </thead>
          <tbody>
            {config.days.map((day, di) => (
              <tr key={day}>
                <th>{day}</th>
                {renderDay(day, di)}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="tg-sheet-legends">
          <table className="tg-sheet-table tg-sheet-small">
            <thead><tr><th>Abbrv</th><th>Name of Faculty</th></tr></thead>
            <tbody>{faculty.map((t) => <tr key={t.id}><td>{t.abbr || "—"}</td><td style={{ textAlign: "left" }}>{t.name}</td></tr>)}</tbody>
          </table>
          <table className="tg-sheet-table tg-sheet-small">
            <thead><tr><th>Abbrv</th><th>Name of Subject</th></tr></thead>
            <tbody>{lectures.map((s) => <tr key={s.id}><td>{s.abbr || "—"}</td><td style={{ textAlign: "left" }}>{s.name}</td></tr>)}</tbody>
          </table>
          <div>
            {subBatchCount > 0 && (
              <table className="tg-sheet-table tg-sheet-small" style={{ marginBottom: 10 }}>
                <thead><tr><th>Batch</th><th>Roll No.</th></tr></thead>
                <tbody>{Array.from({ length: subBatchCount }, (_, i) => <tr key={i}><td>{subBatchLabel(i)}</td><td>{rolls[i] || ""}</td></tr>)}</tbody>
              </table>
            )}
            {labs.length > 0 && (
              <table className="tg-sheet-table tg-sheet-small">
                <thead><tr><th>Abbrv</th><th>Name of Lab</th></tr></thead>
                <tbody>{labs.map((s) => <tr key={s.id}><td>{s.abbr || "—"}</td><td style={{ textAlign: "left" }}>{s.name}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </div>

        <div className="tg-sheet-sign">
          <div><div className="tg-sign-line" />Time Table In-charge</div>
          <div><div className="tg-sign-line" />Department Academic Coordinator</div>
          <div><div className="tg-sign-line" />Head of Department</div>
        </div>
      </div>
    </div>
  );
}

export default PrintPage;
