import Link from "next/link";

export default function TabBar({ active }) {
  const tabs = [
    { key: "home", label: "Codes", href: "/home" },
    { key: "devices", label: "Devices", href: "/devices" },
    { key: "settings", label: "Settings", href: "/settings" },
  ];
  return (
    <div style={{
      display: "flex", borderTop: "1px solid var(--line)", marginTop: 24, paddingTop: 10,
    }}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          style={{
            flex: 1, textAlign: "center", textDecoration: "none",
            color: active === t.key ? "var(--accent)" : "var(--faint)",
            font: "600 12.5px 'Source Sans 3'", padding: "6px 0",
          }}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
