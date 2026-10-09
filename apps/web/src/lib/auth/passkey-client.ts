/**
 * The browser's half of passkeys (/sign-in and /account/security/ load it in a
 * <script>): fetch the options from /api/auth/passkeys/options, turn their base64url
 * fields into bytes for navigator.credentials, and send the answer back as JSON.
 * Browser-only: no Node imports.
 */

type Json = Record<string, unknown>;

function toBytes(text: string): ArrayBuffer {
  const base64 = text.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function toText(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  let binary = "";
  for (const byte of new Uint8Array(buffer))
    binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** Whether this browser can use passkeys at all. */
export function passkeysSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "PublicKeyCredential" in window &&
    typeof navigator.credentials.get === "function"
  );
}

/** Whether passkeys can be offered in the email field's autofill. */
export async function autofillSupported(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  try {
    return await PublicKeyCredential.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

async function post(path: string, body: Json): Promise<Json> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok)
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Something went wrong. Please try again.",
    );
  return data;
}

function descriptors(list: unknown): PublicKeyCredentialDescriptor[] {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const entry = item as { id: string; transports?: AuthenticatorTransport[] };
    return {
      type: "public-key",
      id: toBytes(entry.id),
      ...(entry.transports && { transports: entry.transports }),
    };
  });
}

/** What to tell people when a passkey didn’t work. */
export function problemMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "SecurityError")
    return "Passkeys don’t work on this address of the site.";
  if (error instanceof DOMException && error.name === "InvalidStateError")
    return "That passkey is already on this account.";
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

/** The browser said no (cancelled, timed out, or nothing to offer). */
export function wasCancelled(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "AbortError")
  );
}

/** Makes a passkey for the signed-in account and saves it. */
export async function addPasskey(): Promise<void> {
  const options = await post("/api/auth/passkeys/options", {
    purpose: "register",
  });
  const user = options.user as {
    id: string;
    name: string;
    displayName: string;
  };
  const credential = (await navigator.credentials.create({
    publicKey: {
      ...(options as unknown as PublicKeyCredentialCreationOptions),
      challenge: toBytes(options.challenge as string),
      user: { ...user, id: toBytes(user.id) },
      excludeCredentials: descriptors(options.excludeCredentials),
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new DOMException("No passkey", "NotAllowedError");
  const response = credential.response as AuthenticatorAttestationResponse;
  await post("/api/auth/passkeys/register", {
    credential: {
      id: credential.id,
      type: credential.type,
      response: {
        clientDataJSON: toText(response.clientDataJSON),
        attestationObject: toText(response.attestationObject),
        transports:
          typeof response.getTransports === "function"
            ? response.getTransports()
            : [],
      },
    },
  });
}

/**
 * Signs in with a passkey. `autofill`: offered in the email field's suggestions
 * (conditional mediation), waiting until one is picked or `signal` aborts.
 * Resolves to where to go next.
 */
export async function signInWithPasskey(
  next: string,
  options: { autofill?: boolean; signal?: AbortSignal } = {},
): Promise<string> {
  const request = await post("/api/auth/passkeys/options", {
    purpose: "authenticate",
  });
  const credential = (await navigator.credentials.get({
    publicKey: {
      ...(request as unknown as PublicKeyCredentialRequestOptions),
      challenge: toBytes(request.challenge as string),
      allowCredentials: descriptors(request.allowCredentials),
    },
    ...(options.autofill && { mediation: "conditional" as const }),
    ...(options.signal && { signal: options.signal }),
  })) as PublicKeyCredential | null;
  if (!credential) throw new DOMException("No passkey", "NotAllowedError");
  const response = credential.response as AuthenticatorAssertionResponse;
  const result = await post("/api/auth/passkeys/sign-in", {
    next,
    credential: {
      id: credential.id,
      type: credential.type,
      response: {
        clientDataJSON: toText(response.clientDataJSON),
        authenticatorData: toText(response.authenticatorData),
        signature: toText(response.signature),
        userHandle: toText(response.userHandle),
      },
    },
  });
  return typeof result.next === "string" ? result.next : "/account";
}
