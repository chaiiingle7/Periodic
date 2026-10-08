import React, { useEffect, useState } from "react";
import { Cloud, Trash2, Download, Save } from "lucide-react";
import Field from "./Field";
import { isCloudSaveAvailable, saveTimetable, listTimetables, loadTimetable, deleteTimetable } from "../db";

// Lets an administrator save the current setup (and, once generated, its
// schedule) to Supabase under a name, and load or delete saved entries
// later. If Supabase hasn't been configured (see .env.example), this shows
// a plain explanation instead of broken buttons.
function CloudSaveLoad({ config, schedule, onLoad }) {
  const available = isCloudSaveAvailable();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listErr, setListErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const refresh = async () => {
    if (!available) return;
    setLoadingList(true);
    setListErr("");
    try {
      const data = await listTimetables();
      setRows(data);
    } catch (e) {
      setListErr(e.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaveMsg("");
    setSaveErr("");
    if (!name.trim()) { setSaveErr("Give this setup a name first."); return; }
    setSaving(true);
    try {
      await saveTimetable({ name: name.trim(), config, schedule });
      setSaveMsg("Saved.");
      setName("");
      refresh();
    } catch (e) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id) => {
    setBusyId(id);
    setListErr("");
    try {
      const row = await loadTimetable(id);
      onLoad(row.config, row.schedule);
    } catch (e) {
      setListErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    setBusyId(id);
    setListErr("");
    try {
      await deleteTimetable(id);
      refresh();
    } catch (e) {
      setListErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!available) {
    return (
      <div className="tg-card">
        <div className="tg-section-title" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}><Cloud size={18} /> Save & Load</div>
        <div className="tg-section-sub" style={{ marginBottom: 0 }}>
          Cloud save isn't set up yet. Add <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env</code> file in
          <code>frontend/</code> — see the "Adding Supabase" section of the README for
          the full step-by-step, including the SQL to create the table.
        </div>
      </div>
    );
  }

  return (
    <div className="tg-card">
      <div className="tg-section-title" style={{ fontSize: 18 }}>Save this setup</div>
      <div className="tg-section-sub">
        {schedule
          ? "Saves the current batches/teachers/subjects together with the generated timetable."
          : "Saves the current batches/teachers/subjects. Generate a timetable first if you also want to save that."}
      </div>
      <div className="tg-row tg-grid-2" style={{ alignItems: "end" }}>
        <Field label="Name this setup">
          <input className="tg-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Semester 1 - Final" />
        </Field>
        <button className="tg-btn tg-btn-primary" onClick={handleSave} disabled={saving} style={{ marginBottom: 16 }}>
          <Save size={14} /> {saving ? "Saving…" : "Save to cloud"}
        </button>
      </div>
      {saveMsg && <div className="tg-badge tg-badge-green" style={{ marginBottom: 14 }}>{saveMsg}</div>}
      {saveErr && <div className="tg-badge tg-badge-red" style={{ marginBottom: 14 }}>{saveErr}</div>}

      <hr className="tg-divider" />

      <div className="tg-section-title" style={{ fontSize: 18 }}>Saved setups</div>
      {listErr && <div className="tg-badge tg-badge-red" style={{ marginBottom: 14 }}>{listErr}</div>}
      {loadingList && <div className="tg-subtle">Loading…</div>}
      {!loadingList && rows.length === 0 && <div className="tg-subtle">Nothing saved yet.</div>}
      {rows.map((r) => (
        <div className="tg-list-item" key={r.id}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
            <div className="tg-subtle" style={{ marginTop: 2 }}>
              {new Date(r.created_at).toLocaleString()} {r.schedule ? "· includes a generated timetable" : "· setup only"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="tg-btn tg-btn-secondary tg-btn-sm" onClick={() => handleLoad(r.id)} disabled={busyId === r.id}>
              <Download size={14} /> Load
            </button>
            <button className="tg-btn tg-btn-danger tg-btn-sm" onClick={() => handleDelete(r.id)} disabled={busyId === r.id}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CloudSaveLoad;
