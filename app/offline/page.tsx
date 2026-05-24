"use client";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
        background: "#f8fafc",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>📵</div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#0f172a",
          margin: "0 0 8px",
        }}
      >
        Internet Nahi Hai
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "#64748b",
          margin: "0 0 32px",
          lineHeight: 1.5,
          maxWidth: 280,
        }}
      >
        Pehle app online kholen phir pages visit karen — phir offline bhi
        kaam karega.
      </p>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          maxWidth: 300,
          width: "100%",
          textAlign: "left",
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#0f172a",
            margin: "0 0 8px",
          }}
        >
          Offline karne se pehle ye karen:
        </p>
        <ol
          style={{
            fontSize: 13,
            color: "#64748b",
            margin: 0,
            paddingLeft: 18,
            lineHeight: 2,
          }}
        >
          <li>Internet on karen</li>
          <li>App kholen</li>
          <li>Karigar, Khata, Roznamcha — sab pages visit karen</li>
          <li>Ab offline karo — app kaam karegi</li>
        </ol>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 24,
          background: "#1a56db",
          color: "white",
          border: "none",
          borderRadius: 10,
          padding: "12px 24px",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Dobara Try Karen
      </button>
    </div>
  );
}
