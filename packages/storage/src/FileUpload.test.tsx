// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredFileSummary } from "./api-types";
import type { PartTransport } from "./client";
import { FileUpload } from "./FileUpload";

afterEach(cleanup);

const summary = (
  name: string,
  status: StoredFileSummary["status"],
): StoredFileSummary => ({
  id: "abc123def456",
  name,
  size: 3,
  kind: "data",
  label: "File",
  status,
  visibility: "public",
  statusReason: null,
  pageUrl: "/files/abc123def456/",
  publicUrl: null,
});

function site(finalStatus: StoredFileSummary["status"]) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = input instanceof Request ? input.url : input.toString();
    if (path === "/api/storage/uploads") {
      const { name } = JSON.parse(init?.body as string) as { name: string };
      return Promise.resolve(
        Response.json(
          { file: summary(name, "uploading"), partSize: 3, partCount: 1 },
          { status: 201 },
        ),
      );
    }
    if (path.endsWith("/parts"))
      return Promise.resolve(
        Response.json({ urls: { 1: "https://s3/1" }, expiresIn: 3600 }),
      );
    if (path.endsWith("/complete"))
      return Promise.resolve(
        Response.json({ file: summary("one.txt", finalStatus) }),
      );
    if (path.startsWith("/api/storage/files/"))
      return Promise.resolve(
        Response.json({ file: summary("one.txt", "published") }),
      );
    return Promise.resolve(new Response(null, { status: 204 }));
  }) as typeof fetch;
}

const drop = (...files: File[]) => {
  fireEvent.change(screen.getByTestId("file-input"), {
    target: { files },
  });
};

describe("FileUpload", () => {
  it("uploads dropped files and links to them", async () => {
    const putPart: PartTransport = (_url, body, onProgress) => {
      onProgress(body.size);
      return Promise.resolve();
    };
    const onUploaded = vi.fn();
    render(
      <FileUpload
        purpose="site"
        onUploaded={onUploaded}
        uploadOptions={{ fetch: site("published"), putPart }}
      />,
    );
    drop(new File(["abc"], "one.txt"));

    const link = await screen.findByRole("link", { name: "one.txt" });
    expect(link.getAttribute("href")).toBe("/files/abc123def456/");
    expect(screen.getByText("Uploaded")).toBeTruthy();
    expect(onUploaded).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" }),
    );
  });

  it("asks again about files that are still being checked", async () => {
    const putPart: PartTransport = () => Promise.resolve();
    render(
      <FileUpload
        purpose="site"
        pollMs={10}
        uploadOptions={{ fetch: site("processing"), putPart }}
      />,
    );
    drop(new File(["abc"], "one.txt"));
    expect(await screen.findByText("Checking the file…")).toBeTruthy();
    expect(await screen.findByText("Uploaded")).toBeTruthy();
  });

  it("shows why an upload failed", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(
        Response.json({ error: "That file is too big." }, { status: 413 }),
      ),
    ) as typeof globalThis.fetch;
    render(<FileUpload purpose="site" uploadOptions={{ fetch }} />);
    drop(new File(["abc"], "big.bin"));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "That file is too big.",
    );
  });

  it("takes queued files back when cancelled", async () => {
    let release: () => void = () => undefined;
    const putPart: PartTransport = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    render(
      <FileUpload
        purpose="site"
        uploadOptions={{ fetch: site("published"), putPart }}
      />,
    );
    drop(new File(["abc"], "one.txt"), new File(["def"], "two.txt"));
    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel two.txt" }));
    expect(screen.queryByText("two.txt")).toBeNull();
    release();
    expect(await screen.findByRole("link", { name: "one.txt" })).toBeTruthy();
  });
});
