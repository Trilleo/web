declare namespace App {
  interface Locals {
    /** The signed-in user on server-rendered requests (always null on pre-built pages). */
    user: import("@trilleo/db").User | null;
    session: import("@trilleo/db").Session | null;
  }
}
