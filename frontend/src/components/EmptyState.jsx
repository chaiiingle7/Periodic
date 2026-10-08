import React from "react";

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 20px", color: "var(--tg-ink-soft)" }}>
      <Icon size={30} style={{ marginBottom: 12, opacity: 0.5 }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--tg-ink)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, maxWidth: 380, margin: "0 auto" }}>{body}</div>
    </div>
  );
}

export default EmptyState;
