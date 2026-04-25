import { useLanguage } from "../context/LanguageContext";

export default function LanguageSelector() {
  const { languages, sessionLanguage, changeSessionLanguage, loading } =
    useLanguage();

  if (loading) return null;
  if (languages.length === 0)
    return (
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
        No languages published yet
      </span>
    );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label
        htmlFor="session-lang"
        style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
      >
        Training:
      </label>
      <select
        id="session-lang"
        value={sessionLanguage || ""}
        onChange={(e) => changeSessionLanguage(e.target.value)}
        style={{
          fontSize: 13,
          padding: "4px 10px",
          borderRadius: "var(--border-radius-md)",
          border: "0.5px solid var(--color-border-secondary)",
          background: "var(--color-background-secondary)",
          color: "var(--color-text-primary)",
          cursor: "pointer",
        }}
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name} ({l.code})
          </option>
        ))}
      </select>
    </div>
  );
}
