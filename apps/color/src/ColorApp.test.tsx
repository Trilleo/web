import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ColorApp } from "./ColorApp";

afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});

describe("ColorApp", () => {
  it("starts on the accent, or on the color in the link", () => {
    render(<ColorApp />);
    expect(screen.getByLabelText("Copy HEX")).toBeTruthy();
    expect(screen.getByText("#e5470f", { selector: "code" })).toBeTruthy();
    cleanup();

    history.replaceState(null, "", "/#3a7bd5");
    render(<ColorApp />);
    expect(screen.getByText("#3a7bd5", { selector: "code" })).toBeTruthy();
    expect(screen.getByText("rgb(58, 123, 213)")).toBeTruthy();
  });

  it("takes any CSS color and keeps the link current", () => {
    render(<ColorApp />);
    fireEvent.change(screen.getByLabelText("Any CSS color"), {
      target: { value: "rebeccapurple" },
    });
    expect(screen.getByText("#663399", { selector: "code" })).toBeTruthy();
    expect(location.hash).toBe("#663399");

    fireEvent.change(screen.getByLabelText("Any CSS color"), {
      target: { value: "nope" },
    });
    expect(screen.getByText("Not a color CSS understands.")).toBeTruthy();
    // The last good color stays.
    expect(screen.getByText("#663399", { selector: "code" })).toBeTruthy();
  });

  it("checks contrast and swaps the colors", () => {
    render(<ColorApp />);
    fireEvent.change(screen.getByLabelText("Any CSS color"), {
      target: { value: "#000000" },
    });
    expect(screen.getByText("21.00:1")).toBeTruthy();
    expect(screen.getByText("AAA text").textContent).toContain("passes");

    fireEvent.change(screen.getByLabelText("Background"), {
      target: { value: "#111111" },
    });
    expect(screen.getByText("AA large").textContent).toContain("fails");

    fireEvent.click(screen.getByRole("button", { name: "Swap colors" }));
    expect(screen.getByText("#111111", { selector: "code" })).toBeTruthy();
  });

  it("uses a palette swatch when it's clicked", () => {
    render(<ColorApp />);
    const swatches = screen.getAllByRole("button", { name: /^Use \d+:/ });
    expect(swatches).toHaveLength(11);
    const [, , third] = swatches;
    if (!third) throw new Error("no third swatch");
    const hex =
      /#[0-9a-f]{6}/.exec(third.getAttribute("aria-label") ?? "")?.[0] ?? "";
    fireEvent.click(third);
    expect(screen.getByText(hex, { selector: "code" })).toBeTruthy();
  });
});
