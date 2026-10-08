import React, { useState, useCallback } from "react";

import NavBar from "./components/NavBar";
import { GlassContext } from "./components/GlassLayer";
import LoginPage from "./pages/LoginPage";
import AboutPage from "./pages/AboutPage";
import InputPage from "./pages/InputPage";
import ResultPage from "./pages/ResultPage";
import HelpPage from "./pages/HelpPage";
import PrintPage from "./pages/PrintPage";

import { emptyConfig } from "./utils/helpers";
import { generateTimetableRemote } from "./api";

// This file only wires pages together and owns the top-level state
// (who's logged in, which page is showing, the current config, and the
// last generated schedule). Every page/component lives in its own file
// under ./pages and ./components; the scheduling algorithm itself lives
// in the Python backend (backend/logic.py) and is called via ./api.js.
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [page, setPage] = useState("login");
  const [config, setConfig] = useState(emptyConfig());
  const [schedule, setSchedule] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [glassOn, setGlassOn] = useState(true);

  const handleLogin = (name) => {
    setAdminName(name);
    setAuthed(true);
    setPage("about");
  };
  const handleLogout = () => {
    setAuthed(false);
    setPage("login");
  };

  const handleLoadSaved = (savedConfig, savedSchedule) => {
    setConfig(savedConfig);
    setGenError("");
    if (savedSchedule) {
      setSchedule(savedSchedule);
      setPage("result");
    } else {
      setSchedule(null);
      setPage("input");
    }
  };

  const handleGenerate = useCallback(async () => {
    setGenError("");
    if (config.batches.length === 0 || config.teachers.length === 0) {
      setGenError("Add at least one batch with subjects, and at least one teacher.");
      return;
    }
    setGenerating(true);
    try {
      // The actual scheduling algorithm runs in the local Python backend
      // (backend/logic.py) — see api.js. This call needs that server
      // running on http://127.0.0.1:5000.
      const result = await generateTimetableRemote(config);
      if (result.error) {
        setGenError(result.error);
        setSchedule(null);
      } else {
        setSchedule(result);
        setPage("result");
      }
    } catch (e) {
      setGenError(
        e.message === "Failed to fetch"
          ? "Could not reach the local scheduling server. Make sure the backend is running (see README) at http://127.0.0.1:5000."
          : e.message || "Something went wrong while generating the timetable."
      );
    } finally {
      setGenerating(false);
    }
  }, [config]);

  return (
    <GlassContext.Provider value={glassOn}>
    <div className="tg-root">
      {authed && <NavBar page={page} setPage={setPage} authed={authed} onLogout={handleLogout} hasResult={!!schedule} glassOn={glassOn} setGlassOn={setGlassOn} />}
      {!authed && <LoginPage onLogin={handleLogin} goAbout={() => {}} />}
      {authed && page === "about" && <AboutPage goInput={() => setPage("input")} />}
      {authed && page === "input" && (
        <InputPage config={config} setConfig={setConfig} schedule={schedule} onLoadSaved={handleLoadSaved} onGenerate={handleGenerate} generating={generating} genError={genError} />
      )}
      {authed && page === "result" && <ResultPage config={config} schedule={schedule} onOpenPrint={() => setPage("print")} />}
      {authed && page === "print" && schedule && <PrintPage config={config} schedule={schedule} onBack={() => setPage("result")} />}
      {authed && page === "help" && <HelpPage config={config} schedule={schedule} />}
    </div>
    </GlassContext.Provider>
  );
}
