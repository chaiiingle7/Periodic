import React from "react";

function Field({ label, children }) {
  return (
    <div className="tg-field">
      <label className="tg-label">{label}</label>
      {children}
    </div>
  );
}

export default Field;
