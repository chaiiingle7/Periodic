import React from "react";
import { Calendar, LogIn, LogOut, Sparkles } from "lucide-react";
import GlassLayer from "./GlassLayer";
import { GLASS_TUNING } from "../utils/liquidGlass";

function NavBar({ page, setPage, authed, onLogout, hasResult, glassOn, setGlassOn }) {
  const tabs = [
    { key: "about", label: "About" },
    { key: "input", label: "Set Up" },
    { key: "result", label: "Timetables", disabled: !hasResult },
    { key: "help", label: "Help" },
  ];
  return (
    // Add this to your NavBar component
    {authed && (
      <div className="user-info">
        Welcome, {user}
      </div>
    )}
    <div className="tg-nav">
      <GlassLayer radius={0} type="rounded" tint={GLASS_TUNING.navTint} />
      <div className="tg-nav-inner">
        <div className="tg-brand" onClick={() => setPage(authed ? "about" : "login")}>
          <Calendar size={18} strokeWidth={2.2} />
          Periodic
        </div>
        <div className="tg-tabs">
          {authed && tabs.map((t) => (
            <button
              key={t.key}
              className={`tg-tab ${page === t.key ? "active" : ""}`}
              disabled={t.disabled}
              onClick={() => setPage(t.key)}
              title={t.disabled ? "Generate a timetable first" : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
        {authed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {setGlassOn && (
              <button className="tg-navbtn" style={{ opacity: glassOn ? 1 : 0.55 }} onClick={() => setGlassOn(!glassOn)} title="Toggle the liquid-glass refraction effect (turn off if the page feels slow)">
                <Sparkles size={14} /> Glass {glassOn ? "on" : "off"}
              </button>
            )}
            <button className="tg-navbtn" onClick={onLogout}><LogOut size={14} /> Sign Out</button>
          </div>
        ) : (
          <button className="tg-navbtn" onClick={() => setPage("login")}><LogIn size={14} /> Sign In</button>
        )}
      </div>
    </div>
  );
}

export default NavBar;
