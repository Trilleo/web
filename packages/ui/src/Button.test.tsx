import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, ButtonLink, buttonClasses } from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it("renders a non-submitting button by default", () => {
    render(<Button>Save</Button>);

    expect(
      screen.getByRole("button", { name: "Save" }).getAttribute("type"),
    ).toBe("button");
  });

  it("applies variant classes and keeps caller classes", () => {
    render(
      <Button variant="secondary" className="w-full">
        Cancel
      </Button>,
    );

    const classes = screen
      .getByRole("button", { name: "Cancel" })
      .className.split(" ");
    expect(classes).toContain("border-ink");
    expect(classes).toContain("w-full");
    expect(classes).not.toContain("bg-ink");
  });

  it("forwards native props such as onClick and disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Go" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("ButtonLink", () => {
  it("renders a link with button styling", () => {
    render(<ButtonLink href="/writing">Start reading</ButtonLink>);

    const link = screen.getByRole("link", { name: "Start reading" });
    expect(link.getAttribute("href")).toBe("/writing");
    expect(link.className).toBe(buttonClasses());
  });

  it("supports the secondary variant", () => {
    render(
      <ButtonLink href="/" variant="secondary">
        Home
      </ButtonLink>,
    );

    expect(screen.getByRole("link", { name: "Home" }).className).toBe(
      buttonClasses({ variant: "secondary" }),
    );
  });
});
