export interface HexRow {
  /** "00000010" */
  offset: string;
  /** "89 50 4e 47 …", 16 bytes per row, a wider gap after the eighth. */
  hex: string;
  /** Printable ASCII, "." for the rest. */
  ascii: string;
}

/** The classic hex dump layout, 16 bytes per row. */
export function hexRows(bytes: Uint8Array, start = 0): HexRow[] {
  const rows: HexRow[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const row = [...bytes.subarray(i, i + 16)];
    const cells = row.map((byte) => byte.toString(16).padStart(2, "0"));
    const hex = [cells.slice(0, 8).join(" "), cells.slice(8).join(" ")]
      .filter(Boolean)
      .join("  ");
    rows.push({
      offset: (start + i).toString(16).padStart(8, "0"),
      hex,
      ascii: row
        .map((byte) =>
          byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : ".",
        )
        .join(""),
    });
  }
  return rows;
}
