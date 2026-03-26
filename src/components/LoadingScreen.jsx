export default function LoadingScreen() {
  return (
    <div style={{
      height: "65vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 18,
    }}>
      <div style={{
        width: 36, height: 36,
        border: "1px solid rgba(201,168,76,0.4)",
        borderTopColor: "#c9a84c",
        borderRadius: "50%",
        animation: "spin 0.85s linear infinite",
      }} />
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.38em", color: "#444", textTransform: "uppercase" }}>
        Cargando catálogo
      </p>
    </div>
  );
}
