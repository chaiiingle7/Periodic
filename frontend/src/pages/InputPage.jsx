import React, { useState, useMemo } from "react";
import { Clock, Sparkles, Users, BookOpen, Cloud, Plus, Trash2, Check, Beaker } from "lucide-react";
import Field from "../components/Field";
import EmptyState from "../components/EmptyState";
import CloudSaveLoad from "../components/CloudSaveLoad";
import { uid, DEFAULT_DAYS, buildSampleConfig } from "../utils/helpers";

function InputPage({ config, setConfig, schedule, onLoadSaved, onGenerate, generating, genError }) {
  const [section, setSection] = useState("schedule");

  const updateField = (field, value) => setConfig((c) => ({ ...c, [field]: value }));

  const toggleDay = (day) => {
    setConfig((c) => ({
      ...c,
      days: c.days.includes(day) ? c.days.filter((d) => d !== day) : [...c.days, day].sort((a, b) => DEFAULT_DAYS.indexOf(a) - DEFAULT_DAYS.indexOf(b) || (a > b ? 1 : -1)),
    }));
  };

  const setDayOverride = (day, periods) => setConfig((c) => ({ ...c, dayOverrides: { ...c.dayOverrides, [day]: periods } }));
  const clearDayOverride = (day) => setConfig((c) => {
    const next = { ...c.dayOverrides };
    delete next[day];
    return { ...c, dayOverrides: next };
  });

  // Breaks
  const addBreak = () => setConfig((c) => ({ ...c, breaks: [...c.breaks, { id: uid("br"), afterPeriod: 1, duration: 15, label: "Break" }] }));
  const updateBreak = (id, field, value) => setConfig((c) => ({ ...c, breaks: c.breaks.map((b) => (b.id === id ? { ...b, [field]: value } : b)) }));
  const removeBreak = (id) => setConfig((c) => ({ ...c, breaks: c.breaks.filter((b) => b.id !== id) }));

  // Teachers
  const addTeacher = () => setConfig((c) => ({ ...c, teachers: [...c.teachers, { id: uid("t"), name: "", email: "", subjects: [], maxWeeklyHours: 18, unavailable: [] }] }));
  const updateTeacher = (id, field, value) => setConfig((c) => ({ ...c, teachers: c.teachers.map((t) => (t.id === id ? { ...t, [field]: value } : t)) }));
  const removeTeacher = (id) => setConfig((c) => ({ ...c, teachers: c.teachers.filter((t) => t.id !== id) }));

  // Subjects a teacher can teach (each with its own load/hours) — defined once here,
  // then reused everywhere else so nobody has to retype them.
  const addTeacherSubject = (teacherId) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, subjects: [...t.subjects, { id: uid("ts"), name: "", weeklyHours: 3, isLab: false, labBlockSize: c.labBlockSize }] } : t),
  }));
  const updateTeacherSubject = (teacherId, tsId, field, value) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, subjects: t.subjects.map((s) => s.id === tsId ? { ...s, [field]: value } : s) } : t),
  }));
  const removeTeacherSubject = (teacherId, tsId) => setConfig((c) => ({
    ...c,
    teachers: c.teachers.map((t) => t.id === teacherId ? { ...t, subjects: t.subjects.filter((s) => s.id !== tsId) } : t),
  }));

  // Batches
  const addBatch = () => setConfig((c) => ({ ...c, batches: [...c.batches, { id: uid("b"), name: "", subBatches: 0, subjects: [] }] }));
  const updateBatch = (id, field, value) => setConfig((c) => ({ ...c, batches: c.batches.map((b) => (b.id === id ? { ...b, [field]: value } : b)) }));
  const removeBatch = (id) => setConfig((c) => ({ ...c, batches: c.batches.filter((b) => b.id !== id) }));

  // A batch's subject row only ever *references* an existing teacher + one of
  // that teacher's subjects — name, hours, and lab settings are pulled in
  // automatically instead of being retyped.
  const addSubject = (batchId) => setConfig((c) => ({
    ...c,
    batches: c.batches.map((b) => b.id === batchId ? { ...b, subjects: [...b.subjects, { id: uid("s"), name: "", periodsPerWeek: 0, isLab: false, labBlockSize: c.labBlockSize, teacherId: "" }] } : b),
  }));
  const updateSubject = (batchId, subjId, field, value) => setConfig((c) => ({
    ...c,
    batches: c.batches.map((b) => b.id === batchId ? { ...b, subjects: b.subjects.map((s) => s.id === subjId ? { ...s, [field]: value } : s) } : b),
  }));
  // Selecting a teacher's subject pulls in its name, weekly hours, and lab settings in one go.
  const applyTeacherSubject = (batchId, subjId, teacherId, teacherSubjectId) => setConfig((c) => {
    const teacher = c.teachers.find((t) => t.id === teacherId);
    const ts = teacher?.subjects.find((s) => s.id === teacherSubjectId);
    return {
      ...c,
      batches: c.batches.map((b) => b.id === batchId ? {
        ...b,
        subjects: b.subjects.map((s) => s.id === subjId ? {
          ...s,
          teacherId,
          name: ts?.name || "",
          abbr: ts?.abbr || "",
          periodsPerWeek: ts?.weeklyHours ?? s.periodsPerWeek,
          isLab: ts?.isLab || false,
          labBlockSize: ts?.labBlockSize || c.labBlockSize,
        } : s),
      } : b),
    };
  });
  const removeSubject = (batchId, subjId) => setConfig((c) => ({
    ...c,
    batches: c.batches.map((b) => b.id === batchId ? { ...b, subjects: b.subjects.filter((s) => s.id !== subjId) } : b),
  }));

  // Every distinct subject name any teacher is set up to teach, each mapped to the teachers who can teach it.
  const subjectDirectory = useMemo(() => {
    const map = {};
    config.teachers.forEach((t) => {
      (t.subjects || []).forEach((s) => {
        if (!s.name) return;
        if (!map[s.name]) map[s.name] = [];
        map[s.name].push({ teacherId: t.id, teacherName: t.name || "Unnamed teacher", teacherSubjectId: s.id, weeklyHours: s.weeklyHours, isLab: s.isLab, labBlockSize: s.labBlockSize });
      });
    });
    return map;
  }, [config.teachers]);

  const sections = [
    { key: "schedule", label: "Schedule Settings", icon: Clock },
    { key: "breaks", label: "Breaks & Labs", icon: Sparkles },
    { key: "teachers", label: "Teachers", icon: Users },
    { key: "batches", label: "Batches & Subjects", icon: BookOpen },
    { key: "cloud", label: "Save & Load", icon: Cloud },
  ];

  return (
    <div className="tg-container" style={{ padding: "40px 24px 96px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div className="tg-section-title">Set up your timetable</div>
          <div className="tg-section-sub" style={{ marginBottom: 0 }}>Fill in each section, then generate. You can always come back and adjust.</div>
        </div>
        <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={() => setConfig(buildSampleConfig())}>Load sample data</button>
      </div>

      <div className="tg-pill-tabs" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        {sections.map((s) => (
          <button key={s.key} className={`tg-pill ${section === s.key ? "active" : ""}`} onClick={() => setSection(s.key)}>{s.label}</button>
        ))}
      </div>

      {section === "schedule" && (
        <div className="tg-card">
          <div className="tg-section-title" style={{ fontSize: 18 }}>Working week</div>
          <div className="tg-section-sub">Which days run classes, and how the day is divided into periods.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <button key={d} className="tg-chip" style={{ cursor: "pointer", background: config.days.includes(d) ? "var(--tg-ink)" : "#f5f5f7", color: config.days.includes(d) ? "white" : "var(--tg-ink)" }} onClick={() => toggleDay(d)}>
                {config.days.includes(d) && <Check size={12} />} {d}
              </button>
            ))}
          </div>
          <div className="tg-row tg-grid-4">
            <Field label="Periods per day (default)">
              <input className="tg-input" type="number" min={1} max={14} value={config.periodsPerDay} onChange={(e) => updateField("periodsPerDay", Math.max(1, Number(e.target.value)))} />
            </Field>
            <Field label="Minutes per lecture">
              <input className="tg-input" type="number" min={20} max={120} step={5} value={config.periodDuration} onChange={(e) => updateField("periodDuration", Number(e.target.value))} />
            </Field>
            <Field label="Day starts at">
              <input className="tg-input" type="time" value={config.dayStartTime} onChange={(e) => updateField("dayStartTime", e.target.value)} />
            </Field>
            <Field label="Default lab length (periods)">
              <input className="tg-input" type="number" min={2} max={6} value={config.labBlockSize} onChange={(e) => updateField("labBlockSize", Number(e.target.value))} />
            </Field>
          </div>
          <div className="tg-subtle">Lab sessions run longer than a normal lecture — by default {config.labBlockSize} back-to-back periods (≈{config.labBlockSize * config.periodDuration} minutes) reserved as one block, so they never get split across a break.</div>

          <hr className="tg-divider" />
          <div className="tg-section-title" style={{ fontSize: 18 }}>Scheduling preferences</div>
          <div className="tg-section-sub">Is it okay to leave free lectures in the middle of the day? Most colleges don't allow it.</div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, marginBottom: 12 }}>
            <input type="checkbox" style={{ marginTop: 3 }} checked={!!config.noFreePeriods} onChange={(e) => updateField("noFreePeriods", e.target.checked)} />
            <span><strong>No free periods.</strong> Keep every batch's day packed from the first period — no gaps in the middle (finishing early is fine). If it's impossible with your teachers' hours, the timetable page will tell you how many gaps remain.</span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14 }}>
            <input type="checkbox" style={{ marginTop: 3 }} checked={!!config.labsAfterLunch} onChange={(e) => updateField("labsAfterLunch", e.target.checked)} />
            <span><strong>Labs only after lunch</strong>, in fixed blocks (e.g. periods 5–6 and 7–8), with lectures in the morning.</span>
          </label>
        </div>
      )}

      {section === "schedule" && (
        <div className="tg-card">
          <div className="tg-section-title" style={{ fontSize: 18 }}>Day-specific hours</div>
          <div className="tg-section-sub">Give a day fewer periods for a half day, or leave it on the default. Any break past a shortened day's last period is skipped automatically.</div>
          {config.days.map((day) => {
            const hasOverride = config.dayOverrides && config.dayOverrides[day] != null;
            return (
              <div key={day} className="tg-list-item" style={{ alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, minWidth: 130 }}>
                    <input
                      type="checkbox"
                      checked={hasOverride}
                      onChange={(e) => e.target.checked ? setDayOverride(day, Math.max(1, config.periodsPerDay - 3)) : clearDayOverride(day)}
                    />
                    {day} — half day
                  </label>
                  {hasOverride ? (
                    <>
                      <input
                        className="tg-input"
                        type="number"
                        min={1}
                        max={config.periodsPerDay}
                        style={{ width: 90 }}
                        value={config.dayOverrides[day]}
                        onChange={(e) => setDayOverride(day, Math.max(1, Math.min(config.periodsPerDay, Number(e.target.value))))}
                      />
                      <span className="tg-subtle">periods that day (default is {config.periodsPerDay})</span>
                    </>
                  ) : (
                    <span className="tg-subtle">Uses the default — {config.periodsPerDay} periods</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section === "breaks" && (
        <div className="tg-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="tg-section-title" style={{ fontSize: 18 }}>Breaks</div>
              <div className="tg-section-sub">Lunch and short breaks sit between periods and are skipped by the scheduler.</div>
            </div>
            <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={addBreak}><Plus size={14} /> Add break</button>
          </div>
          {config.breaks.length === 0 && <EmptyState icon={Clock} title="No breaks yet" body="Add a lunch break or short break between periods." />}
          {config.breaks.map((b) => (
            <div className="tg-row tg-grid-4" key={b.id} style={{ alignItems: "end", marginBottom: 14 }}>
              <Field label="Label">
                <input className="tg-input" value={b.label} onChange={(e) => updateBreak(b.id, "label", e.target.value)} placeholder="Lunch Break" />
              </Field>
              <Field label="After period #">
                <input className="tg-input" type="number" min={1} max={config.periodsPerDay - 1} value={b.afterPeriod} onChange={(e) => updateBreak(b.id, "afterPeriod", Number(e.target.value))} />
              </Field>
              <Field label="Duration (min)">
                <input className="tg-input" type="number" min={5} max={90} value={b.duration} onChange={(e) => updateBreak(b.id, "duration", Number(e.target.value))} />
              </Field>
              <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeBreak(b.id)}><Trash2 size={14} /> Remove</button>
            </div>
          ))}
        </div>
      )}

      {section === "teachers" && (
        <div className="tg-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="tg-section-title" style={{ fontSize: 18 }}>Teachers</div>
              <div className="tg-section-sub">Add every subject a teacher covers, each with its own weekly hours — this is the one place you'll type a subject name. Batches will just pick from these.</div>
            </div>
            <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={addTeacher}><Plus size={14} /> Add teacher</button>
          </div>
          {config.teachers.length === 0 && <EmptyState icon={Users} title="No teachers yet" body="Add every teacher who'll appear in the timetable." />}
          {config.teachers.map((t) => (
            <div key={t.id} style={{ border: "1px solid var(--tg-line-soft)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div className="tg-row tg-grid-4" style={{ marginBottom: 4 }}>
                <Field label="Full name">
                  <input className="tg-input" value={t.name} onChange={(e) => updateTeacher(t.id, "name", e.target.value)} placeholder="e.g. Dr. Anika Rao" />
                </Field>
                <Field label="Short form (e.g. PGP)">
                  <input className="tg-input" value={t.abbr || ""} onChange={(e) => updateTeacher(t.id, "abbr", e.target.value)} placeholder="PGP" />
                </Field>
                <Field label="Email (optional — for class reminders)">
                  <input className="tg-input" type="email" value={t.email || ""} onChange={(e) => updateTeacher(t.id, "email", e.target.value)} placeholder="e.g. anika.rao@college.edu" />
                </Field>
                <Field label="Max weekly hours (across all subjects)">
                  <input className="tg-input" type="number" min={1} max={40} value={t.maxWeeklyHours} onChange={(e) => updateTeacher(t.id, "maxWeeklyHours", Number(e.target.value))} />
                </Field>
              </div>

              <div className="tg-label" style={{ marginTop: 14, marginBottom: 8 }}>Subjects taught</div>
              {(t.subjects || []).length === 0 && (
                <div className="tg-subtle" style={{ marginBottom: 10 }}>No subjects added yet — this teacher won't be selectable in any batch until you add at least one.</div>
              )}
              {(t.subjects || []).map((s) => (
                <div key={s.id} style={{ background: "#fafafc", border: "1px solid var(--tg-line-soft)", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div className="tg-row tg-grid-4" style={{ marginBottom: 0, alignItems: "end" }}>
                    <Field label="Subject name (and short form)">
                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="tg-input" value={s.name} onChange={(e) => updateTeacherSubject(t.id, s.id, "name", e.target.value)} placeholder="e.g. Data Structures" />
                        <input className="tg-input" style={{ width: 90 }} value={s.abbr || ""} onChange={(e) => updateTeacherSubject(t.id, s.id, "abbr", e.target.value)} placeholder="DSA" />
                      </div>
                    </Field>
                    <Field label="Default hours (per class / sub-batch)">
                      <input className="tg-input" type="number" min={1} max={20} value={s.weeklyHours} onChange={(e) => updateTeacherSubject(t.id, s.id, "weeklyHours", Number(e.target.value))} />
                    </Field>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 9 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                        <input type="checkbox" checked={s.isLab} onChange={(e) => updateTeacherSubject(t.id, s.id, "isLab", e.target.checked)} />
                        Lab session
                      </label>
                    </div>
                    {s.isLab ? (
                      <Field label="Periods per lab block">
                        <input className="tg-input" type="number" min={2} max={6} value={s.labBlockSize || config.labBlockSize} onChange={(e) => updateTeacherSubject(t.id, s.id, "labBlockSize", Number(e.target.value))} />
                      </Field>
                    ) : <div />}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeTeacherSubject(t.id, s.id)}><Trash2 size={14} /> Remove subject</button>
                  </div>
                </div>
              ))}
              <button className="tg-btn tg-btn-ghost" onClick={() => addTeacherSubject(t.id)}><Plus size={14} /> Add subject</button>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeTeacher(t.id)}><Trash2 size={14} /> Remove teacher</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === "batches" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div className="tg-section-title" style={{ fontSize: 18, marginBottom: 0 }}>Batches & Subjects</div>
              <div className="tg-section-sub">For each batch, list its subjects, weekly tuition hours, and assigned teacher.</div>
            </div>
            <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={addBatch}><Plus size={14} /> Add batch</button>
          </div>
          {config.batches.length === 0 && <div className="tg-card"><EmptyState icon={BookOpen} title="No batches yet" body="Add a batch (class or section) and its subjects." /></div>}
          {config.batches.map((b) => {
            const hasSubBatches = (b.subBatches || 0) > 1;
            return (
            <div className="tg-card" key={b.id}>
              <div style={{ display: "flex", gap: 14, alignItems: "end", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Batch name">
                    <input className="tg-input" value={b.name} onChange={(e) => updateBatch(b.id, "name", e.target.value)} placeholder="e.g. CSE - Year 2 A" />
                  </Field>
                </div>
                <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeBatch(b.id)}><Trash2 size={14} /> Remove batch</button>
              </div>

              <div style={{ background: "#fafafc", border: "1px solid var(--tg-line-soft)", borderRadius: 12, padding: 14, marginBottom: 18 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, marginBottom: hasSubBatches ? 10 : 0 }}>
                  <input
                    type="checkbox"
                    checked={hasSubBatches}
                    onChange={(e) => updateBatch(b.id, "subBatches", e.target.checked ? 3 : 0)}
                  />
                  Is this batch divided into sub-batches for labs?
                </label>
                {hasSubBatches ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="tg-subtle">How many?</span>
                    <input
                      className="tg-input"
                      type="number" min={2} max={8} style={{ width: 90 }}
                      value={b.subBatches}
                      onChange={(e) => updateBatch(b.id, "subBatches", Math.max(2, Number(e.target.value)))}
                    />
                    <span className="tg-subtle">They're called S1–S{b.subBatches}. For each lab subject below, pick which sub-batch it's "For" — each sub-batch gets its own labs, teachers and hours, and different sub-batches can have labs at the same time. Add the same lab twice if two teachers share it (e.g. DSAL with two teachers).</span>
                  </div>
                ) : (
                  <div className="tg-subtle">Leave unchecked if this class attends every lecture and lab together as one group.</div>
                )}
              </div>

              {Object.keys(subjectDirectory).length === 0 && (
                <div className="tg-badge tg-badge-amber" style={{ marginBottom: 14 }}>No subjects defined yet — add subjects under a teacher's profile in the Teachers tab first, then come back here to assign them.</div>
              )}

              {b.subjects.map((s) => {
                const options = subjectDirectory[s.name] || [];
                const eligibleForCurrentTeacher = s.teacherId ? (subjectDirectory[s.name] || []).find((o) => o.teacherId === s.teacherId) : null;
                return (
                  <div key={s.id} style={{ background: "#fafafc", border: "1px solid var(--tg-line-soft)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div className="tg-row tg-grid-4" style={{ marginBottom: 0, alignItems: "end" }}>
                      <Field label="Subject">
                        <select
                          className="tg-select"
                          value={s.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            const firstOption = subjectDirectory[name]?.[0];
                            updateSubject(b.id, s.id, "name", name);
                            if (firstOption) applyTeacherSubject(b.id, s.id, firstOption.teacherId, firstOption.teacherSubjectId);
                          }}
                        >
                          <option value="">Choose a subject…</option>
                          {Object.keys(subjectDirectory).sort().map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </Field>
                      <Field label="Teacher">
                        <select
                          className="tg-select"
                          value={s.teacherId}
                          disabled={!s.name}
                          onChange={(e) => {
                            const opt = options.find((o) => o.teacherId === e.target.value);
                            if (opt) applyTeacherSubject(b.id, s.id, opt.teacherId, opt.teacherSubjectId);
                          }}
                        >
                          <option value="">{s.name ? "Choose…" : "Pick a subject first"}</option>
                          {options.map((o) => <option key={o.teacherId} value={o.teacherId}>{o.teacherName}</option>)}
                        </select>
                      </Field>
                      <Field label="Tuition hours / week">
                        <input className="tg-input" type="number" min={1} max={20} value={s.periodsPerWeek} onChange={(e) => updateSubject(b.id, s.id, "periodsPerWeek", Number(e.target.value))} />
                      </Field>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 9 }}>
                        {s.isLab && hasSubBatches && (
                          <select
                            className="tg-select"
                            style={{ width: 120 }}
                            value={s.subBatchIndex ?? ""}
                            onChange={(e) => updateSubject(b.id, s.id, "subBatchIndex", e.target.value === "" ? null : Number(e.target.value))}
                          >
                            <option value="">Whole class</option>
                            {Array.from({ length: b.subBatches }, (_, i) => <option key={i} value={i}>For S{i + 1}</option>)}
                          </select>
                        )}
                        {s.isLab && <span className="tg-badge tg-badge-blue"><Beaker size={11} /> Lab · {s.labBlockSize || config.labBlockSize}p</span>}
                        <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => removeSubject(b.id, s.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {s.name && !eligibleForCurrentTeacher && !s.teacherId && (
                      <div className="tg-subtle" style={{ marginTop: 8 }}>Hours and lab settings will fill in automatically once you pick a teacher.</div>
                    )}
                  </div>
                );
              })}
              <button className="tg-btn tg-btn-ghost" onClick={() => addSubject(b.id)}><Plus size={14} /> Add subject</button>
            </div>
            );
          })}
        </div>
      )}

      {section === "cloud" && (
        <CloudSaveLoad
          config={config}
          schedule={schedule}
          onLoad={(savedConfig, savedSchedule) => onLoadSaved(savedConfig, savedSchedule)}
        />
      )}

      <div style={{ position: "sticky", bottom: 20, marginTop: 32, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "var(--tg-surface)", border: "1px solid var(--tg-line-soft)", borderRadius: 980, padding: "10px 10px 10px 22px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
          {genError && <span style={{ color: "var(--tg-red)", fontSize: 13 }}>{genError}</span>}
          <button className="tg-btn tg-btn-primary" onClick={onGenerate} disabled={generating}>
            {generating ? "Generating…" : "Generate Timetable"} <Sparkles size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default InputPage;
