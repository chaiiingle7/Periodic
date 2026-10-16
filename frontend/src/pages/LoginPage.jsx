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
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onLogin(email.trim(), password.trim());
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tg-login-shell">
      {/* Your login form content */}
    </div>
  );
}

export default LoginPage;
