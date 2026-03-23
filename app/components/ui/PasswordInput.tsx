"use client";

import { useState } from "react";

const eyeSvg = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const eyeOffSvg = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputStyle?: React.CSSProperties;
};

export function PasswordInput({ inputStyle, style, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", ...style }}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        style={{
          width: "100%",
          paddingRight: 40,
          boxSizing: "border-box",
          ...inputStyle,
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#8A8580",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {visible ? eyeOffSvg : eyeSvg}
      </button>
    </div>
  );
}
