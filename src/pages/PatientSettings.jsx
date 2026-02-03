import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { motion } from "framer-motion";
import { loadAndApplyUserSettings } from "../services/settings";

export default function PatientSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    font_scale: 1,
    theme: "light",
    judging_strength: 2,
    feedback_level: 2,
  });

  /* =====================
     LOAD SETTINGS
  ===================== */
  useEffect(() => {
    loadAndApplyUserSettings()
  }, []);

  /* =====================
     APPLY SETTINGS
  ===================== */
  const applySettings = (s) => {
    document.documentElement.style.setProperty(
      "--font-scale",
      s.font_scale
    );
    document.documentElement.dataset.theme = s.theme;
  };

  /* =====================
     SAVE SETTINGS
  ===================== */
  const saveSettings = async () => {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const payload = {
      user_id: user.id,
      ...settings,
      updated_at: new Date(),
    };

    await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" });

    applySettings(settings);
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 40 }}>Loading settings…</div>;

  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Settings</h1>
      <p style={{ color: "#64748b", marginBottom: 30 }}>
        Customize your therapy experience
      </p>

      {/* FONT SIZE */}
      <Section title="Accessibility">
        <label>Font Size</label>
        <input
          type="range"
          min="0.9"
          max="1.3"
          step="0.05"
          value={settings.font_scale}
          onChange={(e) =>
            setSettings({
              ...settings,
              font_scale: Number(e.target.value),
            })
          }
        />
      </Section>

      {/* THEME */}
      <Section title="Appearance">
        <Toggle
          label="Dark Mode"
          checked={settings.theme === "dark"}
          onChange={(v) =>
            setSettings({
              ...settings,
              theme: v ? "dark" : "light",
            })
          }
        />
      </Section>

      {/* AI JUDGING */}
      <Section title="AI Coaching">
        <label>Judging Strictness</label>
        <Select
          value={settings.judging_strength}
          onChange={(v) =>
            setSettings({ ...settings, judging_strength: v })
          }
          options={[
            { value: 1, label: "Lenient" },
            { value: 2, label: "Balanced" },
            { value: 3, label: "Strict" },
          ]}
        />

        <label style={{ marginTop: 16 }}>Feedback Verbosity</label>
        <Select
          value={settings.feedback_level}
          onChange={(v) =>
            setSettings({ ...settings, feedback_level: v })
          }
          options={[
            { value: 1, label: "Minimal" },
            { value: 2, label: "Normal" },
            { value: 3, label: "Detailed" },
          ]}
        />
      </Section>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={saveSettings}
        disabled={saving}
        style={{
          marginTop: 30,
          width: "100%",
          padding: "14px",
          background: "#2563eb",
          color: "white",
          borderRadius: 10,
          border: "none",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {saving ? "Saving…" : "Save Settings"}
      </motion.button>
    </div>
  );
}

/* =====================
   UI HELPERS
===================== */

const Section = ({ title, children }) => (
  <div
    style={{
      marginBottom: 30,
      padding: 20,
      background: "var(--bg-color)",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
    }}
  >
    <h3 style={{ marginBottom: 12 }}>{title}</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {children}
    </div>
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    {label}
  </label>
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    style={{ padding: 10, borderRadius: 8 }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);
