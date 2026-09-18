import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../page";

describe("Home", () => {
  it("renders the application name", () => {
    render(<Home />);
    expect(screen.getByText("Silver Fox")).toBeInTheDocument();
  });

  it("increments the tap count when the primary button is pressed", async () => {
    const { getByText } = render(<Home />);
    const button = getByText("Tapped 0 times");
    button.click();
    expect(await screen.findByText("Tapped 1 times")).toBeInTheDocument();
  });
});
