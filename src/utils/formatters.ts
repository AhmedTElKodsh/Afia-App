// Date and time formatting utilities

/** Normalize any timestamp format to a JS-parseable ISO string */
function normalizeTimestamp(raw: string): string {
  if (!raw) return "";
  // Already ISO 8601 (contains "T") — return as-is
  if (raw.includes("T")) return raw;
  // Space-separated "YYYY-MM-DD HH:MM:SS" → replace space with "T"
  return raw.replace(" ", "T");
}

export function formatDate(isoString: string): string {
  const normalized = normalizeTimestamp(isoString);
  const date = new Date(normalized);

  // Guard: invalid date → em-dash fallback
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0) {
    return "Today";
  }

  // Yesterday
  if (diffDays === 1) {
    return "Yesterday";
  }

  // This week
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  // This year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Older
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(isoString: string): string {
  const normalized = normalizeTimestamp(isoString);
  const date = new Date(normalized);

  // Guard: invalid date → em-dash fallback
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(isoString: string): string {
  return `${formatDate(isoString)} at ${formatTime(isoString)}`;
}
