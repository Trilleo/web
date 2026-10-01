import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QrApp } from "./QrApp";

afterEach(cleanup);

describe("QrApp", () => {
  it("draws a code for a link and shows what it encodes", () => {
    render(<QrApp />);
    expect(screen.getByText("Your code appears here.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download PNG" })).toHaveProperty(
      "disabled",
      true,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
      target: { value: "trilleo.net" },
    });
    expect(
      screen.getByRole("img", { name: "QR code for: https://trilleo.net" }),
    ).toBeTruthy();
    expect(screen.getByText(/Version \d+ · \d+×\d+ modules/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download PNG" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("switches content kinds and warns about orange", () => {
    render(<QrApp />);
    fireEvent.click(screen.getByLabelText("Wi-Fi"));
    fireEvent.change(screen.getByLabelText("Network name"), {
      target: { value: "Home" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    expect(screen.getByText("WIFI:T:WPA;S:Home;P:secret;;")).toBeTruthy();

    expect(screen.queryByText(/Orange is lighter/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Orange"));
    expect(screen.getByText(/Orange is lighter/)).toBeTruthy();
  });

  it("says when the text is too long", () => {
    render(<QrApp />);
    fireEvent.click(screen.getByLabelText("Text"));
    fireEvent.change(screen.getByRole("textbox", { name: "Text" }), {
      target: { value: "x".repeat(4000) },
    });
    fireEvent.click(screen.getByLabelText(/^H/));
    expect(screen.getByText(/more than one QR code can hold/)).toBeTruthy();
  });
});
