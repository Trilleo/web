import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesApp } from "./NotesApp";

const STORE_KEY = "trilleo:tool:notes";

const browserNotes = () =>
  JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Record<
    string,
    { value: { body: string } }
  >;

async function typeNote(text: string) {
  const editor = await screen.findByLabelText("Note text");
  fireEvent.change(editor, { target: { value: text } });
  fireEvent.blur(editor);
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NotesApp, signed out", () => {
  const renderApp = () =>
    render(
      <NotesApp
        signedIn={false}
        signInHref="/auth/github?next=%2Ftools%2Fnotes%2F"
      />,
    );

  it("says notes stay in this browser, with a way to sign in", async () => {
    renderApp();
    expect(
      screen
        .getByRole("link", { name: "Sign in with GitHub" })
        .getAttribute("href"),
    ).toBe("/auth/github?next=%2Ftools%2Fnotes%2F");
    expect(await screen.findByText(/No notes yet/)).toBeTruthy();
  });

  it("writes a note and keeps it in this browser", async () => {
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "New note" }));
    await typeNote("# Groceries\nmilk and bread");

    const list = screen.getByRole("region", { name: "Your notes" });
    expect(within(list).getByText("Groceries")).toBeTruthy();
    await waitFor(() => {
      expect(
        Object.values(browserNotes()).map((note) => note.value.body),
      ).toEqual(["# Groceries\nmilk and bread"]);
    });
  });

  it("saves typing on its own after a pause", async () => {
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "New note" }));
    fireEvent.change(await screen.findByLabelText("Note text"), {
      target: { value: "typed, not blurred" },
    });
    expect(screen.getByRole("status").textContent).toContain("Editing");
    await waitFor(() => {
      expect(Object.values(browserNotes())[0]?.value.body).toBe(
        "typed, not blurred",
      );
    });
    expect(screen.getByRole("status").textContent).toContain("Saved");
  });

  it("finds notes, previews Markdown, and deletes after asking", async () => {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        a: {
          value: { body: "Astro tips\n*fast* sites" },
          updatedAt: "2026-01-02T00:00:00Z",
        },
        b: { value: { body: "Groceries" }, updatedAt: "2026-01-01T00:00:00Z" },
      }),
    );
    renderApp();
    const list = await screen.findByRole("region", { name: "Your notes" });
    await within(list).findByText("Astro tips");

    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "grocer" },
    });
    expect(within(list).queryByText("Astro tips")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "" },
    });

    fireEvent.click(within(list).getByText("Astro tips"));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const note = screen.getByRole("region", { name: "Note" });
    expect(note.querySelector("em")?.textContent).toBe("fast");

    fireEvent.click(screen.getByRole("button", { name: "Delete note" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(Object.keys(browserNotes())).toEqual(["b"]);
    });
    expect(within(list).queryByText("Astro tips")).toBeNull();
  });

  it("drops a new note that's left empty", async () => {
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "New note" }));
    await screen.findByLabelText("Note text");
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    await typeNote("the one with text");
    await waitFor(() => {
      expect(
        Object.values(browserNotes()).map((note) => note.value.body),
      ).toEqual(["the one with text"]);
    });
  });
});

describe("NotesApp, signed in", () => {
  interface Call {
    method: string;
    url: string;
    body: unknown;
  }

  /** The data API: keeps what's PUT, echoing it back like the server. */
  function stubApi() {
    const calls: Call[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        const body: unknown =
          typeof init?.body === "string" ? JSON.parse(init.body) : null;
        calls.push({ method, url, body });
        const key = decodeURIComponent(url.split("/").at(-1) ?? "");
        if (method === "PUT") {
          const { value } = body as { value: unknown };
          return Promise.resolve(
            Response.json({
              key,
              value,
              updatedAt: "2026-05-05T00:00:00.000Z",
            }),
          );
        }
        if (method === "DELETE")
          return Promise.resolve(new Response(null, { status: 204 }));
        return Promise.resolve(Response.json({ items: [] }));
      }),
    );
    return calls;
  }

  const initialNotes = [
    {
      key: "k1",
      value: { body: "From the account" },
      updatedAt: "2026-04-04T00:00:00.000Z",
    },
  ];

  it("shows the account's notes at once and saves through the data API", async () => {
    const calls = stubApi();
    render(
      <NotesApp signedIn signInHref="/sign-in" initialNotes={initialNotes} />,
    );
    expect(screen.queryByText(/kept in this browser only/)).toBeNull();

    const list = screen.getByRole("region", { name: "Your notes" });
    fireEvent.click(within(list).getByText("From the account"));
    await typeNote("From the account, edited");

    await waitFor(() => {
      expect(calls.filter((call) => call.method === "PUT")).toEqual([
        {
          method: "PUT",
          url: "/api/tools/notes/data/k1",
          body: { value: { body: "From the account, edited" } },
        },
      ]);
    });
  });

  it("offers to move notes left in this browser into the account", async () => {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        old: {
          value: { body: "Written signed out" },
          updatedAt: "2026-01-01T00:00:00Z",
        },
      }),
    );
    const calls = stubApi();
    render(<NotesApp signedIn signInHref="/sign-in" initialNotes={[]} />);

    const move = await screen.findByRole("button", {
      name: "Move to your account",
    });
    await act(async () => {
      fireEvent.click(move);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText("Moved 1 note into your account.")).toBeTruthy();
    });
    expect(
      calls.some((call) => call.method === "PUT" && call.url.endsWith("/old")),
    ).toBe(true);
    expect(browserNotes()).toEqual({});
    expect(
      screen.queryByRole("button", { name: "Move to your account" }),
    ).toBeNull();
  });
});
