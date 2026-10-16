import React, { useState, useEffect } from "react";
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

// Shows a readable message instead of a blank white page if a screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("UI crash:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="tg-container" style={{ padding: "60px 24px" }}>
          <div className="tg-card">
            <div className="tg-section-title" style={{ fontSize: 18 }}>Something went wrong on this page</div>
            <p className="tg-subtle" style={{ margin: "8px 0 16px" }}>
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button
              className="tg-btn tg-btn-primary"
              onClick={() => {
                this.setState({ error: null });
                if (this.props.onReset) this.props.onReset();
              }}
            >
              Back to Set Up
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // State management
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("login");
  const [config, setConfig] = useState(emptyConfig());
  const [schedule, setSchedule] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [glassOn, setGlassOn] = useState(true);
  const [user, setUser] = useState(null);

  // Auth state management: restore session on load AND react to login/logout
  useEffect(() => {
    if (!supabase) return; // not configured; handleLogin will show an error

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthed(!!session);
      if (session) setPage((p) => (p === "login" ? "about" : p));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setAuthed(!!session);
        if (!session) setPage("login");
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle login from LoginPage (errors are passed back so LoginPage can show them)
  const handleLogin = async (email, password) => {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Check your environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) and redeploy."
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setUser(data.user);
    setAuthed(true);
    setPage("about");
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setAuthed(false);
      setPage("login");
      setUser(null);
      setSchedule(null);
    } catch (err) {
      setGenError(err.message || "Logout failed");
    }
  };

  // Generate a timetable via the backend. A bad or error response is never
  // stored as the schedule, so the Result page can't crash on it.
  const handleGenerate = async () => {
    setGenerating(true);
    setGenError("");
    try {
      const result = await generateTimetableRemote(config);
      if (!result || result.error) {
        throw new Error(result?.error || "The server returned an empty response.");
      }
      if (!result.batchSlot || !result.teacherSlot) {
        throw new Error("The server returned an unexpected response. Please try again.");
      }
      setSchedule({
        unplaced: [],
        backToBackCount: 0,
        freePeriodCount: 0,
        teacherWeeklyCount: {},
        overCap: [],
        underCap: [],
        ...result,
      });
      setPage("result");
    } catch (err) {
      setGenError(err.message || "Failed to generate timetable");
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadSaved = (saved) => {
    if (saved?.config) setConfig(saved.config);
    if (saved?.schedule) setSchedule(saved.schedule);
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

        <ErrorBoundary key={page} onReset={() => setPage("input")}>
          {/* Logged out: login page, or the About page if they clicked "New here?" */}
          {!authed && page !== "about" && (
            <LoginPage
              onLogin={handleLogin}
              goAbout={() => setPage("about")}
            />
          )}
          {!authed && page === "about" && (
            <AboutPage goInput={() => setPage("login")} user={undefined} />
          )}

          {/* Logged in */}
          {authed && page === "about" && <AboutPage goInput={() => setPage("input")} user={user?.email} />}
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
          {authed && page === "result" && <ResultPage config={config} schedule={schedule} onOpenPrint={() => setPage("print")} />}
          {authed && page === "print" && schedule && <PrintPage config={config} schedule={schedule} onBack={() => setPage("result")} />}
          {authed && page === "help" && <HelpPage config={config} schedule={schedule} />}
        </ErrorBoundary>
      </div>
    </GlassContext.Provider>
  );
}
