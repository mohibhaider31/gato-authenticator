export default function Screen({ children, center }) {
  return (
    <div
      className="shell"
      style={center ? { justifyContent: "center" } : undefined}
    >
      {children}
    </div>
  );
}

export function Logo({ size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "var(--accent-weak)",
        border: "1px solid var(--accent-line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--accent)",
        fontWeight: 900,
        fontSize: size * 0.42,
      }}
    >
      G
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
