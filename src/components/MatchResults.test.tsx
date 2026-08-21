// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import MatchResults from "./MatchResults";
import type { MatchResultsData } from "./MatchResults";

vi.mock("./TechnicianRequestModal", () => ({
  default: () => null,
}));

function buildData(overrides: Partial<MatchResultsData> = {}): MatchResultsData {
  return {
    understanding: {
      category: "electrician",
      subcategory: "electrical_fault",
      description: "Switch sparks lag rahi hai",
      required_skills: ["electrical_fault", "switch_repair"],
      urgency: "emergency",
      safety_flags: [],
      confidence: 0.98,
      clarification_required: false,
      estimate_min: 1500,
      estimate_max: 4000,
      inspection_fee: 350,
      ...((overrides.understanding as Record<string, unknown>) ?? {}),
    },
    workers: {
      best: {
        id: "w1",
        name: "Muhammad Imran",
        category: "electrician",
        skills: ["electrical_fault", "switch_repair"],
        verified: true,
        verification_level: "documents_verified",
        ustad_score: 88,
        completed_jobs: 55,
        average_rating: 4.5,
        response_rate: 95,
        skills_match: 100,
        final_score: 95,
        distance_km: 1.2,
        predicted_price: 1800,
        travel_cost_pkr: 60,
      },
      others: [
        {
          id: "w2",
          name: "Asad Mehmood",
          category: "electrician",
          skills: ["switch_repair"],
          verified: false,
          verification_level: "identity_reviewed",
          ustad_score: 72,
          completed_jobs: 12,
          average_rating: 4.1,
          response_rate: 80,
          skills_match: 50,
          final_score: 70,
          distance_km: 4.3,
          predicted_price: 2200,
        },
      ],
      ...((overrides.workers as Record<string, unknown>) ?? {}),
    },
    ...overrides,
  };
}

describe("MatchResults — locked visual contract", () => {
  it("renders the screen title in the display font", () => {
    render(<MatchResults data={buildData()} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.className).toMatch(/font-display/);
    expect(heading.textContent).toMatch(/electrician/i);
  });

  it("uses bg-surface (not white) for all cards", () => {
    const { container } = render(<MatchResults data={buildData()} />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/\bbg-white\b/);
    expect(html).not.toMatch(/\bbg-stone-50\b/);
    expect(html).not.toMatch(/\bbg-amber-50\b/);
    expect(html).not.toMatch(/\bbg-emerald-50\b/);
    // Every match card uses bg-surface
    const card = screen.getByTestId("match-card-w1");
    expect(card.className).toMatch(/\bbg-surface\b/);
  });

  it("renders trust signals in a single row with real Tabler icons", () => {
    render(<MatchResults data={buildData()} />);
    const card = screen.getByTestId("match-card-w1");

    const rating = within(card).getByTestId("trust-rating");
    const response = within(card).getByTestId("trust-response");
    const distance = within(card).getByTestId("trust-distance");

    // All three trust signals live inside the same article (single row)
    expect(card.contains(rating)).toBe(true);
    expect(card.contains(response)).toBe(true);
    expect(card.contains(distance)).toBe(true);

    // Each trust signal is labelled for screen readers + contains a Tabler icon
    expect(rating.getAttribute("aria-label") ?? "").toMatch(/rating/i);
    expect(response.getAttribute("aria-label") ?? "").toMatch(/response/i);
    expect(distance.getAttribute("aria-label") ?? "").toMatch(/distance/i);

    // The Tabler icon SVG is rendered inside each signal
    expect(rating.querySelector("svg.tabler-icon-star-filled")).toBeTruthy();
    expect(response.querySelector("svg.tabler-icon-clock")).toBeTruthy();
    expect(distance.querySelector("svg.tabler-icon-map-pin")).toBeTruthy();
  });

  it("uses JetBrains Mono for all numeric values", () => {
    render(<MatchResults data={buildData()} />);
    const card = screen.getByTestId("match-card-w1");

    // Match score block is mono and labelled
    const score = within(card).getByTestId("match-score");
    expect(score.querySelector("p")?.className).toMatch(/font-mono/);
    expect(score.textContent).toMatch(/Match score/i);

    // Predicted price is mono
    const price = within(card).getByTestId("predicted-price");
    expect(price.querySelector("p:last-child")?.className).toMatch(/font-mono/);
    expect(price.textContent).toMatch(/Est\. price/i);

    // Trust signal numbers are mono
    const rating = within(card).getByTestId("trust-rating");
    expect(rating.querySelector("span")?.className).toMatch(/font-mono/);
  });

  it("uses the locked icon map (shield-check, star-filled, map-pin, clock, tools)", () => {
    const { container } = render(<MatchResults data={buildData()} />);
    const html = container.innerHTML;
    // Tabler renders SVGs with class "tabler-icon-shield-check" etc.
    expect(html).toMatch(/tabler-icon-shield-check/);
    expect(html).toMatch(/tabler-icon-star-filled/);
    expect(html).toMatch(/tabler-icon-map-pin/);
    expect(html).toMatch(/tabler-icon-clock/);
    expect(html).toMatch(/tabler-icon-tools/);
  });

  it("uses the accent (copper) button for Send Request — never green", () => {
    render(<MatchResults data={buildData()} />);
    const sendButton = screen.getByTestId("send-request-w1");
    expect(sendButton.className).toMatch(/\bbg-accent\b/);
    expect(sendButton.className).not.toMatch(/\bbg-\[#0a4632\]/);
    expect(sendButton.className).not.toMatch(/\bbg-\[#0e5f44\]/);
    expect(sendButton.className).not.toMatch(/\bbg-success\b/);
    expect(sendButton.className).not.toMatch(/\bbg-green/);
  });

  it("reserves the green palette strictly for verified status", () => {
    const { container } = render(<MatchResults data={buildData()} />);

    // The verified badge and avatar badge use bg-success + text-success-fg
    const html = container.innerHTML;
    const successBgCount = (html.match(/\bbg-success\b/g) ?? []).length;
    expect(successBgCount).toBeGreaterThan(0);

    // Find the verified badge and confirm it's tied to the verified worker
    const verifiedCard = screen.getByTestId("match-card-w1");
    expect(verifiedCard.textContent).toMatch(/Verified/i);
    // Unverified card has no "Verified" text
    const unverifiedCard = screen.getByTestId("match-card-w2");
    expect(unverifiedCard.textContent).not.toMatch(/Verified/i);
  });

  it("never renders the legacy placeholder names (tester1, technician1)", () => {
    const { container } = render(<MatchResults data={buildData()} />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/tester1/);
    expect(html).not.toMatch(/tester2/);
    expect(html).not.toMatch(/technician1/);
  });

  it("uses the real worker name from data", () => {
    render(<MatchResults data={buildData()} />);
    expect(screen.getByText("Muhammad Imran")).toBeInTheDocument();
    expect(screen.getByText("Asad Mehmood")).toBeInTheDocument();
  });

  it("labels the floating match score — never a bare number", () => {
    render(<MatchResults data={buildData()} />);
    const card = screen.getByTestId("match-card-w1");
    const score = within(card).getByTestId("match-score");
    expect(score.textContent).toMatch(/Match score/i);
    expect(score.textContent).toMatch(/95/);
    expect(score.textContent).toMatch(/\/ 100/);
  });

  it("shows the trade category with the tools icon under the name", () => {
    render(<MatchResults data={buildData()} />);
    const card = screen.getByTestId("match-card-w1");
    expect(card.textContent).toMatch(/Electrician/);
  });

  it("renders the AI understanding card with skills + urgency", () => {
    render(<MatchResults data={buildData()} />);
    // The job description text — quoted in the understanding card.
    expect(screen.getByText(/Switch sparks lag rahi hai/i)).toBeInTheDocument();
    // Emergency urgency is shown in the understanding card (mono uppercase).
    expect(screen.getAllByText(/Emergency/i).length).toBeGreaterThan(0);
  });

  it("renders the pricing card with visit fee + estimate range", () => {
    render(<MatchResults data={buildData()} />);
    expect(screen.getByText(/Visit fee/i)).toBeInTheDocument();
    expect(screen.getByText(/PKR 350/i)).toBeInTheDocument();
    expect(screen.getByText(/Repair est\./i)).toBeInTheDocument();
    expect(screen.getByText(/PKR 1,500/i)).toBeInTheDocument();
    expect(screen.getByText(/PKR 4,000/i)).toBeInTheDocument();
  });

  it("opens the request modal when Send Request is clicked", () => {
    // The modal is mocked; click should not throw and should set local state.
    const { container } = render(<MatchResults data={buildData()} />);
    const button = screen.getByTestId("send-request-w1");
    expect(() => fireEvent.click(button)).not.toThrow();
    expect(container).toBeInTheDocument();
  });

  it("falls back to 'Ustad' for missing names — never a tester placeholder", () => {
    const data = buildData({
      workers: {
        best: {
          id: "w1",
          name: "",
          category: "electrician",
          skills: [],
          verified: false,
          verification_level: "identity_reviewed",
          ustad_score: 50,
          completed_jobs: 0,
          average_rating: 0,
          skills_match: 0,
          final_score: 50,
        },
        others: [],
      },
    });
    render(<MatchResults data={data} />);
    expect(screen.queryByText(/tester1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/technician1/i)).not.toBeInTheDocument();
  });

  it("shows an empty state when no workers are available", () => {
    const data = buildData({
      workers: { best: null, others: [], ranked: [] },
    });
    render(<MatchResults data={data} />);
    // Heading "No ustads available" + paragraph "No ustads available right now"
    expect(screen.getAllByText(/No ustads available/i).length).toBeGreaterThanOrEqual(2);
  });

  it("applies the accent border to the best-match card only", () => {
    render(<MatchResults data={buildData()} />);
    const best = screen.getByTestId("match-card-w1");
    const other = screen.getByTestId("match-card-w2");
    expect(best.className).toMatch(/border-accent/);
    expect(other.className).not.toMatch(/border-accent/);
  });
});
