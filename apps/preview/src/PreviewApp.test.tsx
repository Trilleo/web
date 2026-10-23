import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewApp } from "./PreviewApp";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

const choose = (file: File) => {
  fireEvent.change(screen.getByTestId("file-input"), {
    target: { files: [file] },
  });
};

describe("PreviewApp", () => {
  it("shows a dropped text file with its details", async () => {
    render(<PreviewApp />);
    choose(new File(["const a = 1;\nconsole.log(a);"], "main.ts"));
    expect(await screen.findByText("Source code")).toBeTruthy();
    expect(screen.getByText("This device (not uploaded)")).toBeTruthy();
    const code = await screen.findByRole("region", { name: "main.ts" });
    expect(code.textContent).toContain("console.log(a);");
    expect(await screen.findByText("typescript")).toBeTruthy();
  });

  it("fetches a link, remembers it and puts it in the address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response('{"name":"Trilleo","tools":["preview"]}', {
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );
    render(<PreviewApp />);
    fireEvent.change(screen.getByLabelText("Link to a document"), {
      target: { value: "example.com/data.json" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("JSON data")).toBeTruthy();
    expect(screen.getByText("The link, fetched by this browser")).toBeTruthy();
    expect(screen.getByText(/“Trilleo”/)).toBeTruthy();
    expect(new URL(window.location.href).searchParams.get("url")).toBe(
      "https://example.com/data.json",
    );
    expect(localStorage.getItem("trilleo:tool:preview:recent")).toContain(
      "data.json",
    );
  });

  it("explains a link it can't read", async () => {
    render(<PreviewApp />);
    fireEvent.change(screen.getByLabelText("Link to a document"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Only http:// and https:// links can be previewed.",
    );
  });

  it("opens a file inside a ZIP and goes back to the archive", async () => {
    render(<PreviewApp />);
    const archive = zipSync({ "notes/readme.txt": strToU8("Inside the zip") });
    choose(new File([archive], "bundle.zip"));
    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: "Open notes/readme.txt" },
        { timeout: 5000 },
      ),
    );
    expect(await screen.findByText("Inside bundle.zip")).toBeTruthy();
    expect(
      (await screen.findByRole("region", { name: "notes/readme.txt" }))
        .textContent,
    ).toContain("Inside the zip");
    fireEvent.click(screen.getByRole("button", { name: "bundle.zip" }));
    await waitFor(() => {
      expect(screen.getByText("Files inside")).toBeTruthy();
    });
  });

  it("offers Microsoft's viewer for Office links only after asking", async () => {
    const docx = zipSync({
      "[Content_Types].xml": strToU8("<Types/>"),
      "word/document.xml": strToU8("<w:document/>"),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(docx))),
    );
    render(<PreviewApp />);
    fireEvent.change(screen.getByLabelText("Link to a document"), {
      target: { value: "https://example.com/plan.docx" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Microsoft’s viewer…" }),
    );
    expect(screen.queryByTitle(/Microsoft's viewer/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open it there" }));
    const frame = screen.getByTitle("plan.docx in Microsoft's viewer");
    expect(frame.getAttribute("src")).toBe(
      "https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fexample.com%2Fplan.docx",
    );
  });
});
