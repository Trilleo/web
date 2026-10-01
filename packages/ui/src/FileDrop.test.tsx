import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileDrop } from "./FileDrop";

afterEach(cleanup);

const file = (name: string) => new File(["x"], name, { type: "text/plain" });

describe("FileDrop", () => {
  it("passes on chosen files, one unless multiple", () => {
    const onFiles = vi.fn();
    render(<FileDrop title="Drop a file" onFiles={onFiles} />);
    expect(screen.getByRole("button", { name: "Choose a file" })).toBeTruthy();

    fireEvent.change(screen.getByTestId("file-input"), {
      target: { files: [file("a.txt"), file("b.txt")] },
    });
    expect(onFiles).toHaveBeenCalledWith([
      expect.objectContaining({ name: "a.txt" }),
    ]);
  });

  it("takes dropped files", () => {
    const onFiles = vi.fn();
    render(<FileDrop title="Drop files" multiple onFiles={onFiles} />);
    const files = [file("a.txt"), file("b.txt")];
    fireEvent.drop(screen.getByTestId("file-drop"), {
      dataTransfer: { files },
    });
    expect(onFiles).toHaveBeenCalledWith(files);
  });

  it("takes pasted files only when asked to, and not while typing", () => {
    const onFiles = vi.fn();
    render(
      <>
        <FileDrop title="Drop" acceptPaste onFiles={onFiles} />
        <input aria-label="Field" />
      </>,
    );
    const paste = (target: EventTarget) => {
      const event = new Event("paste", { bubbles: true });
      Object.defineProperty(event, "clipboardData", {
        value: { files: [file("pasted.png")] },
      });
      target.dispatchEvent(event);
    };
    paste(screen.getByLabelText("Field"));
    expect(onFiles).not.toHaveBeenCalled();
    paste(document.body);
    expect(onFiles).toHaveBeenCalledOnce();
  });
});
