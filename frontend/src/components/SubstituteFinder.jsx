import React, { useState } from "react";
import { UserCheck, Search, ChevronRight } from "lucide-react";
import Field from "./Field";
import { getPeriodsForDay, timeLabelForPeriod } from "../utils/helpers";
import { findSubstitutesRemote } from "../api";

function SubstituteFinder({ config, schedule }) {
  const [teacherId, setTeacherId] = useState(config.teachers[0]?.id || "");
  const [day, setDay] = useState(config.days[0]);
  const [period, setPeriod] = useState(1);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setSearched(true);
    setError("");
    if (!schedule) { setResult(null); return; }
    setLoading(true);
    try {
      const r = await findSubstitutesRemote(config, schedule, teacherId, day, period);
      setResult(r);
    } catch (e) {
      setError(e.message || "Could not reach the local scheduling server.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tg-card" style={{ background: "#fafafc" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
        <UserCheck size={18} />
        <div style={{ fontWeight: 650, fontSize: 16 }}>Find a substitute for an absent teacher</div>
      </div>
      <p className="tg-subtle" style={{ marginBottom: 18 }}>Pick the absent teacher and the lecture slot in question. Periodic checks who else is qualified and free, and ranks them by how little it disturbs their own timetable — no more paging through every grid by hand.</p>

      {!schedule && <div className="tg-badge tg-badge-amber" style={{ marginBottom: 14 }}>Generate a timetable first so there's a schedule to check against.</div>}

      <div className="tg-row tg-grid-3" style={{ alignItems: "end" }}>
        <Field label="Absent teacher">
          <select className="tg-select" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} disabled={!schedule}>
            {config.teachers.map((t) => <option key={t.id} value={t.id}>{t.name || "Unnamed"}</option>)}
          </select>
        </Field>
        <Field label="Day">
          <select className="tg-select" value={day} onChange={(e) => { setDay(e.target.value); setPeriod((p) => Math.min(p, getPeriodsForDay(config, e.target.value))); }} disabled={!schedule}>
            {config.days.map((d) => <option key={d} value={d}>{d}{getPeriodsForDay(config, d) < config.periodsPerDay ? ` (half day)` : ""}</option>)}
          </select>
        </Field>
        <Field label="Period">
          <select className="tg-select" value={period} onChange={(e) => setPeriod(Number(e.target.value))} disabled={!schedule}>
            {Array.from({ length: getPeriodsForDay(config, day) }, (_, i) => i + 1).map((p) => <option key={p} value={p}>{`P${p} · ${timeLabelForPeriod(config, p)}`}</option>)}
          </select>
        </Field>
      </div>
      <button className="tg-btn tg-btn-primary tg-btn-sm" onClick={run} disabled={!schedule || loading}><Search size={14} /> {loading ? "Checking…" : "Find cover"}</button>

      {error && <div className="tg-badge tg-badge-red" style={{ marginTop: 14 }}>{error}</div>}

      {!loading && !error && searched && schedule && (
        <div style={{ marginTop: 20 }}>
          {!result?.lecture ? (
            <div className="tg-badge tg-badge-green">This teacher has no lecture in that slot — nothing to cover.</div>
          ) : (
            <div>
              <div className="tg-subtle" style={{ marginBottom: 10 }}>
                Covering <strong style={{ color: "var(--tg-ink)" }}>{result.lecture.subjectName}</strong> for <strong style={{ color: "var(--tg-ink)" }}>{config.batches.find((b) => b.id === result.lecture.batchId)?.name}</strong> on {day}, period {period}.
              </div>
              {result.candidates.length === 0 ? (
                <div className="tg-badge tg-badge-red">No qualified teacher is free at this time.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.candidates.slice(0, 5).map((c, i) => (
                    <div key={c.teacher.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", border: "1px solid var(--tg-line-soft)", borderRadius: 12, padding: "12px 16px" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{i === 0 && <span className="tg-badge tg-badge-green" style={{ marginRight: 8 }}>Best fit</span>}{c.teacher.name}</div>
                        <div className="tg-subtle" style={{ marginTop: 4 }}>
                          {Math.round((schedule.teacherWeeklyCount[c.teacher.id] || 0))}/{c.teacher.maxWeeklyHours} hrs this week
                          {c.wouldBeBackToBack ? " · would create a back-to-back period" : " · won't be back-to-back"}
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--tg-ink-soft)" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SubstituteFinder;
