import React, { useState } from "react";
import { Calendar } from "lucide-react";
import Field from "../components/Field";

function LoginPage({ onLogin, goAbout }) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim() || !pw.trim()) { setError("Enter a name and password to continue."); return; }
    setError("");
    onLogin(name.trim());
  };
  const handleKeyDown = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div className="tg-login-shell">
      <div className="tg-login-card">
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--tg-ink)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <Calendar size={22} />
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 650, letterSpacing: "-0.02em" }}>Administrator Sign In</h2>
        <p className="tg-subtle" style={{ marginBottom: 24 }}>Build and manage timetables for your institution.</p>
        <div style={{ textAlign: "left" }}>
          <Field label="Name">
            <input className="tg-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} placeholder="e.g. Rohan Kulkarni" autoFocus />
          </Field>
          <Field label="Password">
            <input className="tg-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={handleKeyDown} placeholder="••••••••" />
          </Field>
          {error && <div style={{ color: "var(--tg-red)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button className="tg-btn tg-btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={submit}>Sign In</button>
        </div>
        <div className="tg-divider" />
        <button className="tg-btn-ghost" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }} onClick={goAbout}>
          New here? Learn what this does →
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
