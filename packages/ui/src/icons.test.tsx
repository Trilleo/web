import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import * as icons from "./icons";

afterEach(cleanup);

describe("icons", () => {
  it.each(Object.entries(icons))(
    "%s is decorative and sized",
    (_name, Icon) => {
      const { container } = render(<Icon size={22} />);
      const svg = container.querySelector("svg");

      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      expect(svg?.getAttribute("width")).toBe("22");
      expect(svg?.getAttribute("height")).toBe("22");
    },
  );
});
