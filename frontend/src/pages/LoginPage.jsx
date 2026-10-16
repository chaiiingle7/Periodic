import React, { useState } from "react";
import { Calendar } from "lucide-react";
import Field from "../components/Field";

function LoginPage({ onLogin, goAbout }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tg-login-shell">
      <div className="tg-login-card">
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--tg-ink)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <Calendar size={22} />
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 650 }}>Administrator Sign In</h2>
        <p className="tg-subtle" style={{ marginBottom: 24 }}>Build and manage timetables for your institution.</p>

        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <input
              className="tg-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@college.edu"
              autoFocus
              required
            />
          </Field>
          <Field label="Password">
            <input
              className="tg-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          {error && <div style={{ color: "var(--tg-red)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            className="tg-btn tg-btn-primary"
            style={{ width: "100%", marginTop: 6 }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="tg-divider" />
        <button
          type="button"
          className="tg-btn-ghost"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
          onClick={goAbout}
        >
          New here? Learn what this does →
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
