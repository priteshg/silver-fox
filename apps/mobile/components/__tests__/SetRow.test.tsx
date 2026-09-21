import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { filterAndClampDigits, MAX_REPS, MAX_RIR, SetRow } from "../SetRow";

function noop() {}

/**
 * Moved here from Playwright's REPS_CASES/RIR_CASES fuzz loops (19 tests
 * that each booted a full workout session to exercise a pure function) —
 * see E2E_PERFORMANCE_AUDIT.md §2. Same boundary values, same verdicts,
 * milliseconds instead of minutes.
 */
describe("filterAndClampDigits", () => {
  it.each([
    ["zero", "0", "0"],
    ["one", "1", "1"],
    ["typical", "10", "10"],
    ["negative sign is stripped, leaving the digits", "-5", "5"],
    ["decimal point is stripped, leaving the digits", "8.5", "85"],
    ["letters are stripped entirely", "ten", ""],
    ["symbols are stripped, leaving the digits", "10x", "10"],
    ["whitespace only", " ", ""],
    ["empty", "", ""],
  ])("reps: %s (%j -> %j)", (_label, input, expected) => {
    expect(filterAndClampDigits(input, MAX_REPS)).toBe(expected);
  });

  it("clamps a huge reps value to the maximum instead of accepting it", () => {
    expect(filterAndClampDigits("100000", MAX_REPS)).toBe(String(MAX_REPS));
  });

  it.each([
    ["minimum (0)", "0", "0"],
    ["maximum (10)", "10", "10"],
    ["typical", "2", "2"],
    ["decimal point is stripped, then the digits clamp to the max", "2.5", "10"],
    ["letters are stripped entirely", "two", ""],
  ])("RIR: %s (%j -> %j)", (_label, input, expected) => {
    expect(filterAndClampDigits(input, MAX_RIR)).toBe(expected);
  });

  it("clamps an above-maximum RIR to 10 instead of accepting it", () => {
    expect(filterAndClampDigits("11", MAX_RIR)).toBe("10");
  });

  it("clamps a huge RIR value to the maximum instead of accepting it", () => {
    expect(filterAndClampDigits("999", MAX_RIR)).toBe(String(MAX_RIR));
  });

  it("never produces a value Number() would turn into NaN", () => {
    for (const bad of ["abc", "NaN", "Infinity", "1e999", "0x10", "  "]) {
      const result = filterAndClampDigits(bad, MAX_REPS);
      expect(result === "" || !Number.isNaN(Number(result))).toBe(true);
    }
  });
});

describe("SetRow", () => {
  it("picks up a previous-session prefill that arrives after mount", () => {
    const { rerender } = render(
      <SetRow setId="set_1" setNumber={1} completed={false} onComplete={noop} onUncomplete={noop} />,
    );

    // Simulates workout history resolving from storage after the row has
    // already mounted with no prefill — the inputs should still populate.
    rerender(
      <SetRow
        setId="set_1"
        setNumber={1}
        completed={false}
        initialWeight={100}
        initialReps={8}
        onComplete={noop}
        onUncomplete={noop}
      />,
    );

    expect(screen.getByLabelText("kg: 100")).toBeInTheDocument();
    expect(screen.getByLabelText("reps")).toHaveValue("8");
  });

  it("doesn't clobber a value the user already adjusted once a late prefill arrives", () => {
    const { rerender } = render(
      <SetRow setId="set_1" setNumber={1} completed={false} onComplete={noop} onUncomplete={noop} />,
    );

    // Default weight is 20kg; bump it to 25 via the stepper (0.5kg per click) before the prefill arrives.
    const increase = screen.getByRole("button", { name: "Increase weight" });
    for (let i = 0; i < 10; i++) fireEvent.click(increase);
    expect(screen.getByLabelText("kg: 25")).toBeInTheDocument();

    rerender(
      <SetRow
        setId="set_1"
        setNumber={1}
        completed={false}
        initialWeight={100}
        initialReps={8}
        onComplete={noop}
        onUncomplete={noop}
      />,
    );

    expect(screen.getByLabelText("kg: 25")).toBeInTheDocument();
  });

  it("completes the set with the adjusted weight and typed reps, and marks it visually done", () => {
    const onComplete = vi.fn();
    render(<SetRow setId="set_1" setNumber={1} completed={false} onComplete={onComplete} onUncomplete={noop} />);

    const increase = screen.getByRole("button", { name: "Increase weight" });
    for (let i = 0; i < 10; i++) fireEvent.click(increase); // 20 -> 25 (0.5kg per click: whole-number progression)
    fireEvent.change(screen.getByLabelText("reps"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete set 1" }));

    expect(onComplete).toHaveBeenCalledWith("set_1", { weight: 25, reps: 6, rir: undefined });
  });

  it("weight cannot go below zero or above the sensible maximum", () => {
    render(<SetRow setId="set_1" setNumber={1} completed={false} onComplete={noop} onUncomplete={noop} />);

    const decrease = screen.getByRole("button", { name: "Decrease weight" });
    for (let i = 0; i < 45; i++) fireEvent.click(decrease); // far more than the default (20) can absorb at 0.5kg per click
    expect(screen.getByLabelText("kg: 0")).toBeInTheDocument();

    const increase = screen.getByRole("button", { name: "Increase weight" });
    for (let i = 0; i < 1010; i++) fireEvent.click(increase); // 0 -> 505, more than the 500kg ceiling at 0.5kg per click
    expect(screen.getByLabelText("kg: 500")).toBeInTheDocument();
  });

  // The progression engine (loadProgression.ts) can suggest a weight rounded
  // to the nearest half kilogram (e.g. 82.5) — these four tests confirm the
  // weight control represents every value it can produce, not just whole
  // numbers. See PROGRESSION_LOGIC_AUDIT.md, Risk 1.
  describe("fractional (half-kilogram) weights", () => {
    it("displays a fractional recorded weight exactly as given", () => {
      render(
        <SetRow
          setId="set_1"
          setNumber={1}
          completed={false}
          initialWeight={82.5}
          onComplete={noop}
          onUncomplete={noop}
        />,
      );

      expect(screen.getByLabelText("kg: 82.5")).toBeInTheDocument();
    });

    it("adjusts a fractional starting weight by exactly one half-kilogram step", () => {
      render(
        <SetRow
          setId="set_1"
          setNumber={1}
          completed={false}
          initialWeight={82.5}
          onComplete={noop}
          onUncomplete={noop}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Increase weight" }));
      expect(screen.getByLabelText("kg: 83")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Decrease weight" }));
      fireEvent.click(screen.getByRole("button", { name: "Decrease weight" }));
      expect(screen.getByLabelText("kg: 82")).toBeInTheDocument();
    });

    it("records a suggested fractional weight exactly when the set is completed", () => {
      // Simulates applying a progression suggestion of 82.5kg (loadProgression.ts's
      // roundToHalf output) as this set's prefilled weight, then completing it unchanged.
      const onComplete = vi.fn();
      render(
        <SetRow
          setId="set_1"
          setNumber={1}
          completed={false}
          initialWeight={82.5}
          initialReps={8}
          onComplete={onComplete}
          onUncomplete={noop}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Complete set 1" }));

      expect(onComplete).toHaveBeenCalledWith("set_1", { weight: 82.5, reps: 8, rir: undefined });
    });
  });
});
