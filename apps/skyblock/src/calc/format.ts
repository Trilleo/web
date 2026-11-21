/** Numbers and times as the calculator shows them, and gzip for the mods' formats. */

/** 1234.5 → "1,234.5"; whole numbers stay whole. */
export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en", { maximumFractionDigits: digits });
}

/** Hours as "45 s", "12 min", "3 h 05 min", "2 d 4 h"; Infinity as "can't". */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return "can’t be done";
  const seconds = Math.round(hours * 3600);
  if (seconds < 60) return `${String(seconds)} s`;
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${String(minutes)} min`;
  const totalMinutes = minutes;
  const days = Math.floor(totalMinutes / (24 * 60));
  const h = Math.floor((totalMinutes % (24 * 60)) / 60);
  const m = totalMinutes % 60;
  if (days > 0) return `${String(days)} d ${String(h)} h`;
  return `${String(h)} h ${String(m).padStart(2, "0")} min`;
}

/** Shards an hour, for rates. */
export function formatRate(rate: number): string {
  return rate > 0 ? `${formatNumber(rate)} an hour` : "can’t be hunted";
}

/** `prefix` + base64 of the gzipped text: the mods' clipboard format. */
export async function gzipBase64(
  prefix: string,
  text: string,
): Promise<string> {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK)
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return prefix + btoa(binary);
}

/** Coins as the game writes them: "850", "12.4k", "3.21M", "1.05B". */
export function formatCoins(coins: number): string {
  if (!Number.isFinite(coins)) return "can’t be done";
  const abs = Math.abs(coins);
  const sign = coins < 0 ? "−" : "";
  const scaled = (n: number, unit: string) =>
    `${sign}${n.toLocaleString("en", { maximumFractionDigits: n < 10 ? 2 : n < 100 ? 1 : 0 })}${unit}`;
  if (abs >= 1e9) return `${scaled(abs / 1e9, "B")} coins`;
  if (abs >= 1e6) return `${scaled(abs / 1e6, "M")} coins`;
  if (abs >= 1e4) return `${scaled(abs / 1e3, "k")} coins`;
  return `${sign}${abs.toLocaleString("en", { maximumFractionDigits: abs < 10 ? 2 : 0 })} coins`;
}

/** A cost in the plan's own unit: hours, or coins in coin mode. */
export function formatCost(value: number, mode: "time" | "coins"): string {
  return mode === "coins" ? formatCoins(value) : formatHours(value);
}
