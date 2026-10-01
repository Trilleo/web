import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InspectApp } from "./InspectApp";

afterEach(cleanup);

const choose = (file: File) => {
  fireEvent.change(screen.getByTestId("file-input"), {
    target: { files: [file] },
  });
};

describe("InspectApp", () => {
  it("shows a file's type, hashes and first bytes, and checks a pasted hash", async () => {
    render(<InspectApp />);
    choose(new File(["abc"], "abc.txt", { type: "text/plain" }));

    expect(await screen.findByText("abc.txt")).toBeTruthy();
    expect(screen.getByText("Plain text (text/plain)")).toBeTruthy();
    const sha256 = await screen.findByText(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256.dataset.hash).toBe("sha256");
    expect(screen.getByLabelText(/bytes in hexadecimal/).textContent).toContain(
      "00000000  61 62 63",
    );

    const check = screen.getByLabelText("Check against a hash");
    fireEvent.change(check, {
      target: { value: "900150983CD24FB0D6963F7D28E17F72" },
    });
    expect(screen.getByText("Matches the MD5 hash.")).toBeTruthy();
    fireEvent.change(check, { target: { value: "deadbeef" } });
    expect(screen.getByText(/No match/)).toBeTruthy();

    // Text gets counted.
    await waitFor(() => {
      expect(screen.getByText("Text")).toBeTruthy();
    });
    expect(screen.getByText("ASCII")).toBeTruthy();
  });

  it("warns when the name and the contents disagree", async () => {
    render(<InspectApp />);
    choose(
      new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])], "cat.png"),
    );
    expect(await screen.findByRole("note")).toHaveProperty(
      "textContent",
      expect.stringContaining("JPEG image") as string,
    );
  });
});
