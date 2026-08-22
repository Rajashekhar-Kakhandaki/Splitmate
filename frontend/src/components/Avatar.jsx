const PALETTE = ["#B08D57", "#2F6F5E", "#A23B3B", "#3B5BA2", "#7A4FA3", "#B0703E"];

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function Avatar({ name, size = "md" }) {
  const dims = size === "sm" ? "w-7 h-7 text-[10px]" : "w-10 h-10 text-sm";
  return (
    <div
      title={name}
      className={`${dims} rounded-full flex items-center justify-center font-mono font-bold text-paper shrink-0 ring-2 ring-paper dark:ring-dark-bg`}
      style={{ backgroundColor: colorFor(name) }}
    >
      {initials(name)}
    </div>
  );
}
