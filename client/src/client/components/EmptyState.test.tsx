// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconTools } from "@tabler/icons-react";
import EmptyState from "./EmptyState";

function renderEmpty(overrides: Partial<Parameters<typeof EmptyState>[0]> = {}) {
  return render(
    <EmptyState
      icon={IconTools}
      message={{ urdu: "کوئی کام نہیں ملا", english: "No jobs found" }}
      ctaLabel="Post a job"
      onCta={vi.fn()}
      {...overrides}
    />,
  );
}

describe("EmptyState", () => {
  it("renders the icon, both messages, and CTA", () => {
    renderEmpty();

    expect(screen.getByText("کوئی کام نہیں ملا")).toBeInTheDocument();
    expect(screen.getByText("No jobs found")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Post a job" }),
    ).toBeInTheDocument();
  });

  it("marks the icon decorative with aria-hidden", () => {
    const { container } = renderEmpty();
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("calls onCta when the CTA is clicked", async () => {
    const user = userEvent.setup();
    const onCta = vi.fn();
    renderEmpty({ onCta });

    await user.click(screen.getByRole("button", { name: "Post a job" }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("renders the Urdu line with the urdu font class", () => {
    renderEmpty();
    const urduLine = screen.getByText("کوئی کام نہیں ملا");
    expect(urduLine).toHaveClass("font-urdu");
  });
});
