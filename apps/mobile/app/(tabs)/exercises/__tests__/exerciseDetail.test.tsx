import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockAsyncStorage } from "../../../../test/mockAsyncStorage";
import ExerciseDetailScreen from "../[exerciseId]";

vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ exerciseId: "ex_bench_press" }),
}));

describe("ExerciseDetailScreen", () => {
  beforeEach(() => {
    resetMockAsyncStorage();
  });

  it("renders the exercise name, description, and coaching content", async () => {
    render(<ExerciseDetailScreen />);

    expect(await screen.findByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText(/classic horizontal press/i)).toBeInTheDocument();
    expect(screen.getByText(/cornerstone upper-body press/i)).toBeInTheDocument();
    expect(screen.getByText(/eyes under the bar/i)).toBeInTheDocument();
    expect(screen.getByText(/press it back up to lockout/i)).toBeInTheDocument();
  });

  it("shows form cues and common mistakes from the exercise data", async () => {
    render(<ExerciseDetailScreen />);

    await screen.findByText("Bench Press");
    expect(screen.getByText(/Retract your shoulder blades/i)).toBeInTheDocument();
    expect(screen.getByText(/Bouncing the bar off the chest/i)).toBeInTheDocument();
  });

  it("shows a no-history state when the exercise has never been logged", async () => {
    render(<ExerciseDetailScreen />);

    expect(await screen.findByText(/No logged sets yet/i)).toBeInTheDocument();
  });
});
