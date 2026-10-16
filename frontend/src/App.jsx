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

  // Auth state management
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
      setAuthed(!!session);
    };
    checkAuth();

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

  // Rest of your existing functions...

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
        {/* Rest of your page rendering */}
      </div>
    </GlassContext.Provider>
  );
}
