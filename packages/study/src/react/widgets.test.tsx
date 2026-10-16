// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createRenderer } from "../render";
import type { Island } from "../types";
import { CircuitLab } from "./CircuitLab";
import { Explore } from "./Explore";
import { Plot } from "./Plot";
import { Quiz } from "./Quiz";

afterEach(cleanup);

/** Widgets' props as a lesson's renderer makes them. */
function island(body: string): Island {
  const [first] = createRenderer().render({
    number: "1.1",
    title: "T",
    body,
  }).islands;
  if (!first) throw new Error("no island");
  return first;
}

describe("Quiz", () => {
  test("checks answers and keeps a first-try score", () => {
    const quiz = island(
      "::: quiz Q\n? 1 + 1?\nanswer: 2\n> Because.\n\n? Pick B\n- [ ] A\n- [x] B\n:::",
    );
    if (quiz.name !== "quiz") throw new Error("not a quiz");
    render(<Quiz {...quiz.props} />);
    expect(screen.getByText("2 questions")).toBeTruthy();

    const input = screen.getByLabelText("Your answer to question 1");
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText(/Not quite/)).toBeTruthy();
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Right.")).toBeTruthy();
    // The first try counted.
    expect(screen.getByText("0 of 1 right first time")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("B"));
    const [, second] = screen.getAllByRole("button", { name: "Check" });
    if (!second) throw new Error("no second question");
    fireEvent.click(second);
    expect(screen.getByText("1 of 2 right first time")).toBeTruthy();
  });

  test("asks for an answer before checking", () => {
    const quiz = island("::: quiz\n? Pick B\n- [ ] A\n- [x] B\n:::");
    if (quiz.name !== "quiz") throw new Error("not a quiz");
    render(<Quiz {...quiz.props} />);
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText("Choose an answer first.")).toBeTruthy();
    expect(screen.getByText("1 question")).toBeTruthy();
  });
});

describe("Explore", () => {
  test("works results out from the sliders", () => {
    const explore = island(
      "::: explore\nslider V: 0 .. 10 = 5 | V\nslider R: 1 .. 100 = 10 | Ω\nI = V / R | A | Current\n:::",
    );
    if (explore.name === "quiz") throw new Error("not a widget");
    render(<Explore {...explore.props} />);
    expect(screen.getByText("500 mA")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("V"), { target: { value: "1000" } });
    expect(screen.getByText("1 A")).toBeTruthy();
  });
});

describe("Plot", () => {
  test("draws a curve per function and reads values with the keyboard", () => {
    const plot = island("::: plot Lines\nx: 0 .. 10\nf(x) = 2x\ng(x) = x\n:::");
    if (plot.name === "quiz") throw new Error("not a widget");
    const { container } = render(<Plot {...plot.props} />);
    expect(container.querySelectorAll(".plot-curve")).toHaveLength(2);
    const graph = screen.getByRole("img", { name: /Lines/ });
    fireEvent.keyDown(graph, { key: "ArrowRight" });
    expect(screen.getByText("x = 5.1: f = 10.2, g = 5.1")).toBeTruthy();
  });
});

describe("CircuitLab", () => {
  test("solves the circuit and re-solves when a part changes", () => {
    const lab = island(
      "::: circuit-sim\nV1 0,4 0,0 10V\nR1 0,0 4,0 1k\nR2 4,0 4,4 1k\nW 0,4 4,4\nG 0,4\n:::",
    );
    if (lab.name === "quiz") throw new Error("not a widget");
    render(<CircuitLab {...lab.props} />);
    const r2 = () => screen.getByRole("row", { name: /R2/ });
    expect(r2().textContent).toContain("5 V");
    // R2's slider spans 100 Ω – 10 kΩ; the far end is 10 kΩ.
    fireEvent.change(screen.getByLabelText("R2"), {
      target: { value: "1000" },
    });
    expect(r2().textContent).toContain("9.09 V");
  });

  test("says when a circuit can't be solved", () => {
    const lab = island(
      "::: circuit-sim\nV1 0,4 0,0 5V\nV2 2,4 2,0 3V\nW 0,0 2,0\nW 0,4 2,4\n:::",
    );
    if (lab.name === "quiz") throw new Error("not a widget");
    render(<CircuitLab {...lab.props} />);
    expect(screen.getByText(/no single solution/)).toBeTruthy();
  });
});
