import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConvertApp } from "./ConvertApp";

afterEach(cleanup);

const add = (...files: File[]) => {
  fireEvent.change(screen.getByTestId("file-input"), {
    target: { files },
  });
};

const png = () =>
  new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])],
    "photo.png",
  );
const wav = () =>
  new File([new TextEncoder().encode("RIFF\0\0\0\0WAVEfmt ")], "song.wav");

describe("ConvertApp", () => {
  it("shows settings only for the kinds of files added", async () => {
    render(<ConvertApp />);
    expect(screen.queryByRole("region", { name: /Images/ })).toBeNull();

    add(png());
    expect(await screen.findByRole("region", { name: /Images/ })).toBeTruthy();
    expect(screen.queryByRole("region", { name: /Audio/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Convert 1 file" })).toBeTruthy();

    add(wav());
    expect(await screen.findByRole("region", { name: /Audio/ })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Convert 2 files" }),
    ).toBeTruthy();
  });

  it("lists files it can't convert without counting them", async () => {
    render(<ConvertApp />);
    add(new File(["%PDF-1.7"], "paper.pdf"));
    const list = await screen.findByRole("list", { name: "Files to convert" });
    expect(within(list).getByText(/Can't convert this/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Convert/ })).toBeNull();
  });

  it("swaps options with the format, and checks the trim range", async () => {
    render(<ConvertApp />);
    add(png(), wav());
    await screen.findByRole("region", { name: /Audio/ });

    expect(screen.getByLabelText(/Quality/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("PNG"));
    expect(screen.queryByLabelText(/Quality/)).toBeNull();
    fireEvent.click(screen.getByLabelText("JPEG"));
    expect(screen.getByLabelText("Background")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("ICO"));
    expect(screen.getByRole("group", { name: "Icon sizes" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Start at (s)"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("End at (s)"), {
      target: { value: "5" },
    });
    expect(screen.getByRole("alert").textContent).toMatch(/after the start/);
    expect(
      screen.getByRole("button", { name: "Convert 2 files" }),
    ).toHaveProperty("disabled", true);
  });

  it("removes files from the list", async () => {
    render(<ConvertApp />);
    add(png());
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove photo.png" }),
    );
    expect(screen.queryByText("photo.png")).toBeNull();
  });
});
