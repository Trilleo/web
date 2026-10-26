declare namespace App {
  interface Locals {
    /** The signed-in user on server-rendered requests (always null on pre-built pages). */
    user: import("@trilleo/db").User | null;
    session: import("@trilleo/db").Session | null;
    /** Pop-ups the page asked for (lib/toast.ts), rendered by Toasts.astro. */
    toasts?: import("./lib/toast").PageToast[];
  }
}
