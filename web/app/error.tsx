"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      style={{
        padding: "var(--sp-9) var(--sp-6)",
        maxWidth: "640px",
        margin: "0 auto",
        fontFamily: "var(--font-mono)",
        color: "var(--fg-primary)",
      }}
    >
      <p
        style={{
          fontSize: "var(--type-caption)",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--fg-tertiary)",
          textTransform: "uppercase",
        }}
      >
        ERROR · CSS WRANGLER
      </p>
      <h1
        style={{
          fontSize: "var(--type-headline-sm)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          marginTop: "var(--sp-5)",
        }}
      >
        Something failed to render.
      </h1>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-body)",
          color: "var(--fg-secondary)",
          lineHeight: "var(--leading-normal)",
          marginTop: "var(--sp-5)",
          maxWidth: "60ch",
        }}
      >
        The page hit an exception during render. Logs are in Vercel. Hitting reset re-renders this
        page; if it fails again, the bug is in the code, not the data.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: "var(--sp-7)",
          padding: "var(--sp-3) var(--sp-5)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-sm)",
          background: "transparent",
          color: "var(--fg-primary)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--type-label)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        ▸ RESET
      </button>
    </main>
  );
}
