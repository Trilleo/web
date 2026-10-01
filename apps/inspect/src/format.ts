const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/** "1,234,567" or "2.8". */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** "0:04.25", "3:25.40", "1:02:03". */
export function formatDuration(exact: number): string {
  if (!Number.isFinite(exact) || exact < 0) return "—";
  // Round first, so 59.999 s reads "1:00.00", not "0:60.00".
  const seconds = Math.round(exact * 100) / 100;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) {
    return `${String(hours)}:${String(minutes).padStart(2, "0")}:${String(Math.floor(rest)).padStart(2, "0")}`;
  }
  return `${String(minutes)}:${rest.toFixed(2).padStart(5, "0")}`;
}

/** "2026-09-30 14:05:09" in the viewer's own time zone. */
export function formatLocalDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
