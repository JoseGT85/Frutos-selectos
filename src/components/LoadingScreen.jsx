export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#070707", position: "relative", overflow: "hidden",
    }}>
      {/* Radial glow */}
      <div style={{
        position: "absolute", width: 400, height: 400,
        background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)",
        borderRadius: "50%", animation: "pulseGold 3s infinite",
        pointerEvents: "none",
      }} aria-hidden="true" />

      {/* Logo */}
      <h1 className="serif" style={{
        fontSize: "2rem", fontWeight: 300, letterSpacing: "0.16em",
        color: "#e8e0d0", marginBottom: 8, position: "relative",
        animation: "fadeUp 0.8s ease both",
      }}>
        FRUTOS <span style={{ color: "#c9a84c", fontStyle: "italic" }}>Selectos</span>
      </h1>

      <p style={{
        fontSize: "0.52rem", letterSpacing: "0.4em", color: "#3a3530",
        textTransform: "uppercase", marginBottom: 32,
        animation: "fadeUp 0.8s ease 0.2s both",
      }}>
        Calidad Premium · Mendoza
      </p>

      {/* Animated dots */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 24,
        animation: "fadeUp 0.8s ease 0.4s both",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#c9a84c",
            animation: `loadingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <p style={{
        fontSize: "0.6rem", color: "#555", letterSpacing: "0.08em",
        animation: "fadeUp 0.8s ease 0.5s both",
      }}>
        Preparando tu selección…
      </p>

      <style>{`
        @keyframes loadingDot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
