import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Choice, Field } from "./controls";

afterEach(cleanup);

describe("Choice", () => {
  it("is a radio group that reports the picked value", () => {
    const onChange = vi.fn();
    render(
      <Choice
        legend="Format"
        value="png"
        options={[
          { value: "png", label: "PNG" },
          { value: "webp", label: "WebP" },
          { value: "avif", label: "AVIF", disabled: true },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("group", { name: "Format" })).toBeTruthy();
    expect(screen.getByLabelText("PNG")).toHaveProperty("checked", true);
    expect(screen.getByLabelText("AVIF")).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByLabelText("WebP"));
    expect(onChange).toHaveBeenCalledWith("webp");
  });
});

describe("Field", () => {
  it("labels its control and links the hint as a description", () => {
    render(
      <Field label="Max width" hint="Blank keeps the size.">
        {(props) => <input {...props} />}
      </Field>,
    );
    const input = screen.getByLabelText("Max width");
    expect(input.getAttribute("aria-describedby")).toBe(
      screen.getByText("Blank keeps the size.").id,
    );
  });
});
