import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScoreCalculator } from "./ScoreCalculator";

afterEach(cleanup);

function type(label: string, value: string, within_: HTMLElement) {
  fireEvent.change(within(within_).getByLabelText(label), {
    target: { value },
  });
}

describe("ScoreCalculator", () => {
  it("lists what each rank allows", () => {
    render(<ScoreCalculator notes={1000} constant={150} />);
    const table = screen.getByTestId("rank-table");
    const sssPlus = within(table).getByRole("row", { name: /^SSS\+/ });
    expect(
      within(sssPlus)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["1,009,000", "100", "1", "0", "17.15"]);
  });

  it("scores a play", () => {
    render(<ScoreCalculator notes={1000} constant={150} />);
    const panel = screen.getByTestId("play-panel");
    type("Justice", "98", panel);
    type("Attack", "1", panel);
    type("Miss", "1", panel);
    expect(screen.getByTestId("play-score").textContent).toBe("1,007,500 SSS");
    expect(screen.getByTestId("play-rating").textContent).toBe("Rating 17.00");
    expect(panel.textContent).toContain("SSS+: 1,500 points more");
    expect(panel.textContent).toContain("0 more Justice would still be SSS.");
    type("Miss", "999", panel);
    expect(within(panel).getByRole("alert").textContent).toMatch(
      /more judgements/,
    );
  });

  it("works out the Justice left after Attacks and Misses", () => {
    render(<ScoreCalculator notes={1000} constant={150} />);
    const panel = screen.getByTestId("budget-panel");
    fireEvent.change(within(panel).getByLabelText("Rank"), {
      target: { value: "SSS" },
    });
    type("Attack", "1", panel);
    type("Miss", "1", panel);
    expect(screen.getByTestId("budget-result").textContent).toBe(
      "Up to 98 Justice for SSS.",
    );
    type("Miss", "3", panel);
    expect(screen.getByTestId("budget-result").textContent).toMatch(
      /Out of reach/,
    );
  });

  it("finds the score a rating needs", () => {
    render(<ScoreCalculator notes={1000} constant={150} />);
    const panel = screen.getByTestId("rating-panel");
    type("Rating", "16.5", panel);
    expect(screen.getByTestId("rating-result").textContent).toBe(
      "Needs 1,005,000 (SS+).",
    );
    type("Rating", "17.2", panel);
    expect(screen.getByTestId("rating-result").textContent).toMatch(
      /at most 17.15/,
    );
  });

  it("asks for the note count when it isn't known, and skips rating without a constant", () => {
    render(<ScoreCalculator notes={null} constant={null} />);
    expect(screen.queryByTestId("rank-table")).toBeNull();
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "500" },
    });
    expect(screen.getByTestId("rank-table")).toBeTruthy();
    expect(screen.getByTestId("rating-panel").textContent).toMatch(
      /no constant/,
    );
  });
});
