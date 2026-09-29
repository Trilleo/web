/** A text field from a submitted form ("" if missing or a file). */
export function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const MAX_ID = 2_147_483_647;

/** A comment id from a form, or null if it isn't one. */
export function parseId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= MAX_ID ? id : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A user id from a form, or null if it isn't one. */
export function parseUserId(value: string): string | null {
  return UUID.test(value) ? value.toLowerCase() : null;
}
