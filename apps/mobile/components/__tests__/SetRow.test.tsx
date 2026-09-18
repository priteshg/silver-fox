import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SetRow } from "../SetRow";

function noop() {}

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

    expect(screen.getByLabelText("kg")).toHaveValue("100");
    expect(screen.getByLabelText("reps")).toHaveValue("8");
  });

  it("doesn't clobber a value the user already typed once a late prefill arrives", () => {
    const { rerender } = render(
      <SetRow setId="set_1" setNumber={1} completed={false} onComplete={noop} onUncomplete={noop} />,
    );

    fireEvent.change(screen.getByLabelText("kg"), { target: { value: "60" } });

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

    expect(screen.getByLabelText("kg")).toHaveValue("60");
  });

  it("completes the set with the typed values and marks it visually done", () => {
    const onComplete = vi.fn();
    render(<SetRow setId="set_1" setNumber={1} completed={false} onComplete={onComplete} onUncomplete={noop} />);

    fireEvent.change(screen.getByLabelText("kg"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("reps"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete set 1" }));

    expect(onComplete).toHaveBeenCalledWith("set_1", { weight: 100, reps: 6, rir: undefined });
  });
});
