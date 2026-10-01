import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COPIED_MS, CopyButton } from "./CopyButton";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CopyButton", () => {
  it("copies its value and says so for a moment", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<CopyButton value="abc123" label="Copy SHA-256" />);
    const button = screen.getByRole("button", { name: "Copy SHA-256" });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith("abc123");
    expect(button.textContent).toBe("Copied");

    act(() => {
      vi.advanceTimersByTime(COPIED_MS);
    });
    expect(button.textContent).toBe("Copy");
  });
});
