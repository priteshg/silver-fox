import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// jsdom/react-native-web's Image preloads via an internal `window.Image()`
// object decoupled from the visible <img> tag, so a real `error` DOM event
// on that tag never reaches the component's onError handler. Stubbing Image
// with a plain <img> lets this one test actually exercise that path.
vi.mock("react-native", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react-native");
  return {
    ...actual,
    Image: ({ source, accessibilityLabel, onError }: { source?: { uri?: string }; accessibilityLabel?: string; onError?: () => void }) => (
      <img src={source?.uri} alt="" aria-label={accessibilityLabel} onError={onError} />
    ),
  };
});

const { ExerciseMediaView } = await import("../ExerciseMedia");

describe("ExerciseMediaView", () => {
  it("shows a placeholder when there is no media", () => {
    render(<ExerciseMediaView exerciseName="Bench Press" />);
    expect(screen.getByLabelText("Bench Press demonstration placeholder")).toBeInTheDocument();
  });

  it("shows a placeholder for the explicit placeholder media type", () => {
    render(<ExerciseMediaView exerciseName="Bench Press" media={{ type: "placeholder" }} />);
    expect(screen.getByLabelText("Bench Press demonstration placeholder")).toBeInTheDocument();
  });

  it("shows a video-specific placeholder when video isn't wired to a player yet", () => {
    render(<ExerciseMediaView exerciseName="Bench Press" media={{ type: "video", url: "https://example.com/v.mp4" }} />);
    expect(screen.getByText("Video demonstration coming soon")).toBeInTheDocument();
  });

  it("renders the image when media is a usable image URL", () => {
    render(
      <ExerciseMediaView
        exerciseName="Bench Press"
        media={{ type: "image", url: "https://example.com/bench.jpg", altText: "Bench press bottom position" }}
      />,
    );
    expect(screen.getByLabelText("Bench press bottom position")).toBeInTheDocument();
  });

  it("falls back to the placeholder when media has no URL at all", () => {
    render(<ExerciseMediaView exerciseName="Bench Press" media={{ type: "image" }} />);
    expect(screen.getByLabelText("Bench Press demonstration placeholder")).toBeInTheDocument();
  });

  it("recovers once a failed image is swapped for a different one, instead of staying stuck on the fallback", () => {
    const { rerender } = render(
      <ExerciseMediaView exerciseName="Bench Press" media={{ type: "image", url: "https://example.com/broken.jpg" }} />,
    );
    const img = screen.getByLabelText("Bench Press demonstration");
    fireEvent.error(img);
    expect(screen.getByLabelText("Bench Press demonstration placeholder")).toBeInTheDocument();

    rerender(
      <ExerciseMediaView exerciseName="Squat" media={{ type: "image", url: "https://example.com/squat.jpg" }} />,
    );
    expect(screen.getByLabelText("Squat demonstration")).toBeInTheDocument();
  });
});
