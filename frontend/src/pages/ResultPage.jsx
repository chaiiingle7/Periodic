import React, { useState } from "react";
import { AlertTriangle, Check, Calendar, Printer } from "lucide-react";
import ReminderPanel from "../components/ReminderPanel";
import GridTable from "../components/GridTable";
import GridLegend from "../components/GridLegend";
import EmptyState from "../components/EmptyState";
import Field from "../components/Field";
import { getPeriodsForDay, timeLabelForPeriod, subBatchLabel, subBatchColor } from "../utils/helpers";

function buildBatchCellView(config, cell, subBatchFilter) {
  if (!cell) return null;
  if (cell.isRotation) {
    if (subBatchFilter == null || subBatchFilter === "all") {
      return {
        isRotation: true,
        rows: cell.assignments.map((a) => ({
          label: subBatchLabel(a.subBatchIndex),
          color: subBatchColor(a.subBatchIndex),
          title: `${a.subjectAbbr || a.subjectName} · ${teacherLabel(config, a.teacherId)}`,
        })),
      };
    }
    const a = cell.assignments.find((x) => x.subBatchIndex === subBatchFilter);
    if (!a) return null; // this sub-batch is free during this particular rotation round
    const teacher = config.teachers.find((t) => t.id === a.teacherId);
    return { title: a.subjectAbbr || a.subjectName, sub: teacher?.name || "—", isLab: true };
  }
  const teacher = config.teachers.find((t) => t.id === cell.teacherId);
  return { title: cell.subjectAbbr || cell.subjectName, sub: teacher?.name || "—", isLab: cell.isLab };
}

function teacherLabel(config, id) {
  const t = config.teachers.find((x) => x.id === id);
  return t?.abbr || t?.name || "—";
}

function buildTeacherCellView(config, cell) {
  if (!cell) return null;
  const batch = config.batches.find((b) => b.id === cell.batchId);
  const sub = cell.subBatchIndex != null ? `${batch?.name || "—"} · Sub-batch ${subBatchLabel(cell.subBatchIndex)}` : (batch?.name || "—");
  return { title: cell.subjectAbbr || cell.subjectName, sub, isLab: cell.isLab };
}

function ResultPage({ config, schedule, onOpenPrint }) {
  const [tab, setTab] = useState("batches");
  const [selectedBatch, setSelectedBatch] = useState(config.batches[0]?.id);
  const [subBatchFilter, setSubBatchFilter] = useState("all");
  const [selectedTeacher, setSelectedTeacher] = useState(config.teachers[0]?.id);
  const [exploreType, setExploreType] = useState("teacher");
  const [exploreId, setExploreId] = useState(config.teachers[0]?.id);
  const [exploreDay, setExploreDay] = useState(config.days[0]);
  const [explorePeriod, setExplorePeriod] = useState(1);

  if (!schedule) {
    return <div className="tg-container" style={{ padding: "60px 24px" }}><EmptyState icon={Calendar} title="Nothing generated yet" body="Head to Set Up and generate a timetable first." /></div>;
  }

  const currentBatch = config.batches.find((b) => b.id === selectedBatch);
  const hasSubBatches = (currentBatch?.subBatches || 0) > 1;

  const warnings = [];
  if (schedule.unplaced?.length) warnings.push(`${schedule.unplaced.length} lecture${schedule.unplaced.length > 1 ? "s" : ""} could not be placed without breaking a rule.`);
  if (config.noFreePeriods && schedule.freePeriodCount > 0) warnings.push(`${schedule.freePeriodCount} free period${schedule.freePeriodCount > 1 ? "s" : ""} couldn't be avoided with the current teacher hours — try adding hours or another teacher for a subject.`);
  if (schedule.overCap?.length) warnings.push(`${schedule.overCap.map((t) => t.name || "Unnamed").join(", ")} exceed${schedule.overCap.length === 1 ? "s" : ""} their weekly hour cap.`);

  return (
    <div className="tg-container" style={{ padding: "40px 24px 96px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="tg-section-title">Generated timetables</div>
          <div className="tg-section-sub">
            {schedule.unplaced.length} unplaced lecture{schedule.unplaced.length === 1 ? "" : "s"}
            {config.noFreePeriods && <> · {schedule.freePeriodCount || 0} free period{(schedule.freePeriodCount || 0) === 1 ? "" : "s"} in the middle of a day</>}
            {" "}· {schedule.backToBackCount} back-to-back instance{schedule.backToBackCount === 1 ? "" : "s"} for teachers.
          </div>
        </div>
        <button className="tg-btn tg-btn-primary tg-btn-sm" onClick={onOpenPrint}><Printer size={14} /> Printable format</button>
      </div>

      {warnings.length > 0 && (
        <div className="tg-card" style={{ borderColor: "#f5d3ba", background: "#fff8f0", marginBottom: 20 }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, marginBottom: i === warnings.length - 1 ? 0 : 8 }}>
              <AlertTriangle size={16} color="var(--tg-amber)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{w}</span>
            </div>
          ))}
          {schedule.unplaced.length > 0 && (
            <ul style={{ margin: "10px 0 0", paddingLeft: 26, fontSize: 13 }}>
              {schedule.unplaced.map((u, i) => (
                <li key={i}>{u.batchName} — {u.isRotation ? `Lab rotation (${u.assignments.map((a) => a.subjectName).join(", ")})` : u.subjectName}: {u.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="tg-pill-tabs" style={{ marginBottom: 24 }}>
        <button className={`tg-pill ${tab === "batches" ? "active" : ""}`} onClick={() => setTab("batches")}>Student Timetables</button>
        <button className={`tg-pill ${tab === "teachers" ? "active" : ""}`} onClick={() => setTab("teachers")}>Teacher Timetables</button>
        <button className={`tg-pill ${tab === "explore" ? "active" : ""}`} onClick={() => setTab("explore")}>Availability Explorer</button>
      </div>

      {tab === "batches" && (
        <div className="tg-card">
          <div style={{ marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <select className="tg-select" style={{ maxWidth: 280 }} value={selectedBatch} onChange={(e) => { setSelectedBatch(e.target.value); setSubBatchFilter("all"); }}>
              {config.batches.map((b) => <option key={b.id} value={b.id}>{b.name || "Unnamed batch"}</option>)}
            </select>
            {hasSubBatches && (
              <select className="tg-select" style={{ maxWidth: 220 }} value={subBatchFilter} onChange={(e) => setSubBatchFilter(e.target.value === "all" ? "all" : Number(e.target.value))}>
                <option value="all">All sub-batches (lab view)</option>
                {Array.from({ length: currentBatch.subBatches }, (_, i) => i).map((i) => (
                  <option key={i} value={i}>Sub-batch {subBatchLabel(i)} only</option>
                ))}
              </select>
            )}
            {hasSubBatches && <span className="tg-badge tg-badge-blue">{currentBatch.subBatches} sub-batches rotate through labs</span>}
          </div>
          <GridLegend />
          <GridTable config={config} rowsResolver={(day, period) => buildBatchCellView(config, schedule.batchSlot[selectedBatch]?.[day]?.[period], subBatchFilter)} />
        </div>
      )}

      {tab === "teachers" && (
        <div className="tg-card">
          <div style={{ marginBottom: 18, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <select className="tg-select" style={{ maxWidth: 280 }} value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
              {config.teachers.map((t) => <option key={t.id} value={t.id}>{t.name || "Unnamed teacher"}</option>)}
            </select>
            {selectedTeacher && (
              <span className="tg-badge tg-badge-blue">{schedule.teacherWeeklyCount[selectedTeacher] || 0} / {config.teachers.find((t) => t.id === selectedTeacher)?.maxWeeklyHours || "∞"} weekly hours used</span>
            )}
          </div>
          <GridLegend />
          <GridTable config={config} rowsResolver={(day, period) => buildTeacherCellView(config, schedule.teacherSlot[selectedTeacher]?.[day]?.[period])} />
        </div>
      )}

      {tab === "explore" && (
        <div className="tg-card">
          <div className="tg-section-title" style={{ fontSize: 18 }}>Who's free, when?</div>
          <div className="tg-section-sub">Check a teacher's or a batch's status for any day and period.</div>
          <div className="tg-row tg-grid-4" style={{ alignItems: "end" }}>
            <Field label="Looking up">
              <select className="tg-select" value={exploreType} onChange={(e) => { setExploreType(e.target.value); setExploreId(e.target.value === "teacher" ? config.teachers[0]?.id : config.batches[0]?.id); }}>
                <option value="teacher">Teacher</option>
                <option value="batch">Batch</option>
              </select>
            </Field>
            <Field label={exploreType === "teacher" ? "Teacher" : "Batch"}>
              <select className="tg-select" value={exploreId} onChange={(e) => setExploreId(e.target.value)}>
                {(exploreType === "teacher" ? config.teachers : config.batches).map((x) => <option key={x.id} value={x.id}>{x.name || "Unnamed"}</option>)}
              </select>
            </Field>
            <Field label="Day">
              <select className="tg-select" value={exploreDay} onChange={(e) => { setExploreDay(e.target.value); setExplorePeriod((p) => Math.min(p, getPeriodsForDay(config, e.target.value))); }}>
                {config.days.map((d) => <option key={d} value={d}>{d}{getPeriodsForDay(config, d) < config.periodsPerDay ? ` (half day)` : ""}</option>)}
              </select>
            </Field>
            <Field label="Period">
              <select className="tg-select" value={explorePeriod} onChange={(e) => setExplorePeriod(Number(e.target.value))}>
                {Array.from({ length: getPeriodsForDay(config, exploreDay) }, (_, i) => i + 1).map((p) => <option key={p} value={p}>{`P${p} · ${timeLabelForPeriod(config, p)}`}</option>)}
              </select>
            </Field>
          </div>
          {exploreId && (() => {
            const slotMap = exploreType === "teacher" ? schedule.teacherSlot : schedule.batchSlot;
            const cell = slotMap[exploreId]?.[exploreDay]?.[explorePeriod];
            if (!cell) return <div className="tg-badge tg-badge-green" style={{ fontSize: 13, padding: "8px 16px" }}><Check size={14} /> Free at this time</div>;
            if (cell.isRotation) {
              return (
                <div className="tg-badge tg-badge-red" style={{ fontSize: 13, padding: "8px 16px" }}>
                  Busy — lab rotation running ({cell.assignments.map((a) => a.subjectName).join(", ")})
                </div>
              );
            }
            const other = exploreType === "teacher" ? config.batches.find((b) => b.id === cell.batchId) : config.teachers.find((t) => t.id === cell.teacherId);
            return (
              <div className="tg-badge tg-badge-red" style={{ fontSize: 13, padding: "8px 16px" }}>
                Busy — teaching {cell.subjectName} {exploreType === "teacher" ? `to ${other?.name}` : `with ${other?.name}`}
              </div>
            );
          })()}

          <hr className="tg-divider" />
          <div className="tg-subtle" style={{ marginBottom: 10, fontWeight: 600 }}>Full week at a glance</div>
          <GridLegend />
          <GridTable config={config} rowsResolver={(day, period) => {
            const cell = (exploreType === "teacher" ? schedule.teacherSlot : schedule.batchSlot)[exploreId]?.[day]?.[period];
            return exploreType === "teacher" ? buildTeacherCellView(config, cell) : buildBatchCellView(config, cell, "all");
          }} />
        </div>
      )}

      <ReminderPanel config={config} schedule={schedule} />
    </div>
  );
}

export default ResultPage;
