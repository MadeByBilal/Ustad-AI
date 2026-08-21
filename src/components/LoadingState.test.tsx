// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingState from "./LoadingState";

describe("LoadingState", () => {
  it("renders a status region for assistive tech", () => {
    render(<LoadingState type="general" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("voice: shows one of the rotating Urdu status phrases", () => {
    render(<LoadingState type="voice" />);
    expect(
      screen.getByText(/سن رہا ہوں|سمجھ رہا ہوں|تیار کر رہا ہوں/),
    ).toBeInTheDocument();
  });

  it("voice: renders seven animated waveform bars", () => {
    const { container } = render(<LoadingState type="voice" />);
    const bars = container.querySelectorAll(".bg-accent.rounded-full");
    expect(bars.length).toBeGreaterThanOrEqual(7);
  });

  it("matching: renders a card-shaped skeleton with surface background", () => {
    const { container } = render(<LoadingState type="matching" />);
    expect(container.querySelector(".bg-surface.rounded-2xl")).toBeInTheDocument();
  });

  it("general: renders three pulsing accent dots", () => {
    const { container } = render(<LoadingState type="general" />);
    const dots = container.querySelectorAll(".bg-accent.rounded-full");
    expect(dots.length).toBe(3);
  });

  it("general: shows the optional message when provided", () => {
    render(<LoadingState type="general" message="Loading workers" />);
    expect(screen.getByText("Loading workers")).toBeInTheDocument();
  });

  it("general: omits the message paragraph when not provided", () => {
    render(<LoadingState type="general" />);
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
  });
});
