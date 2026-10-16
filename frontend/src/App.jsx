import React, { useState, useEffect, useCallback } from "react";
import { supabase } from './supabaseClient';
import NavBar from "./components/NavBar";
import { GlassContext } from "./components/GlassLayer";
import LoginPage from "./pages/LoginPage";
import AboutPage from "./pages/AboutPage";
import InputPage from "./pages/InputPage";import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
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

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("login");
  const [config, setConfig] = useState(emptyConfig());
  const [schedule, setSchedule] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [glassOn, setGlassOn] = useState(true);
  const [user, setUser] = useState(null);

  // Initialize auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
      setAuthed(!!session);
    };
    checkAuth();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user);
        setAuthed(!!session);
        if (session) {
          setPage("about");
        } else {
          setPage("login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      // Auth state change will handle the page transition
    } catch (err) {
      setGenError(err.message || "Login failed");
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setGenError(err.message || "Logout failed");
    }
  };

  // Rest of your existing functions remain the same...
  const handleLoadSaved = async (savedConfig, savedSchedule) => {
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

  const handleGenerate = async () => {
    // Your existing generate function
    // ...
  };

  return (
    <GlassContext.Provider value={glassOn}>
      <div className="tg-root">
        {authed && (
          <NavBar
            page={page}
            setPage={setPage}
            authed={authed}
            onLogout={handleLogout}
            hasResult={!!schedule}
            glassOn={glassOn}
            setGlassOn={setGlassOn}
            user={user?.email || ''}
          />
        )}
        {!authed && (
          <LoginPage
            onLogin={handleLogin}
            goAbout={() => setPage("about")}
          />
        )}
        {authed && page === "about" && <AboutPage goInput={() => setPage("input")} />}
        {/* Rest of your page rendering */}
      </div>
    </GlassContext.Provider>
  );
}
import ResultPage from "./pages/ResultPage";
import HelpPage from "./pages/HelpPage";
import PrintPage from "./pages/PrintPage";
import { emptyConfig } from "./utils/helpers";
import { generateTimetableRemote } from "./api";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("login");
  const [config, setConfig] = useState(emptyConfig());
  const [schedule, setSchedule] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [glassOn, setGlassOn] = useState(true);
  const [user, setUser] = useState(null);

  // Auth state management
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
      setAuthed(!!session);
    };
    checkAuth();

    // Re-check auth on token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
      setAuthed(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      setAuthed(true);
      setPage("about");
    } catch (err) {
      setGenError(err.message || "Login failed");
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthed(false);
      setPage("login");
      setUser(null);
    } catch (err) {
      setGenError(err.message || "Logout failed");
    }
  };

  // Rest of your existing functions remain the same...
  const handleLoadSaved = async (savedConfig, savedSchedule) => {
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
        {authed && (
          <NavBar
            page={page}
            setPage={setPage}
            authed={authed}
            onLogout={handleLogout}
            hasResult={!!schedule}
            glassOn={glassOn}
            setGlassOn={setGlassOn}
            user={user?.email || ''}
          />
        )}
        {!authed && (
          <LoginPage
            onLogin={handleLogin}
            goAbout={() => setPage("about")}
          />
        )}
        {authed && page === "about" && <AboutPage
          goInput={() => setPage("input")}
          user={user?.email}
        />}
        {authed && page === "input" && (
          <InputPage
            config={config}
            setConfig={setConfig}
            schedule={schedule}
            onLoadSaved={handleLoadSaved}
            onGenerate={handleGenerate}
            generating={generating}
            genError={genError}
          />
        )}
        {authed && page === "result" && <ResultPage
          config={config}
          schedule={schedule}
          onOpenPrint={() => setPage("print")}
        />}
        {authed && page === "print" && schedule && <PrintPage
          config={config}
          schedule={schedule}
          onBack={() => setPage("result")}
        />}
        {authed && page === "help" && <HelpPage
          config={config}
          schedule={schedule}
        />}
      </div>
    </GlassContext.Provider>
  );
}
