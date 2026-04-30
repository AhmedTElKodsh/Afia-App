import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CupVisualization } from "../components/FillConfirmScreen/CupVisualization";

describe("CupVisualization — cup calibration 220ml = 1 cup", () => {
  it("0ml → '0 cups'", () => {
    render(<CupVisualization waterMl={0} />);
    expect(screen.getByText("fillConfirm.cups.zero")).toBeInTheDocument();
  });

  it("55ml → '1/4 Cup' (one cup icon, no badge)", () => {
    const { container } = render(<CupVisualization waterMl={55} />);
    expect(screen.getByText("fillConfirm.cups.quarter")).toBeInTheDocument();
    // Single cup icon only — no count badge
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  it("110ml → '1/2 Cup'", () => {
    render(<CupVisualization waterMl={110} />);
    expect(screen.getByText("fillConfirm.cups.half")).toBeInTheDocument();
  });

  it("165ml → '3/4 Cup'", () => {
    render(<CupVisualization waterMl={165} />);
    expect(screen.getByText("fillConfirm.cups.threeQuarters")).toBeInTheDocument();
  });

  it("220ml → '1 Cup' with badge '1' + one cup icon", () => {
    const { container } = render(<CupVisualization waterMl={220} />);
    expect(screen.getByText("fillConfirm.cups.one")).toBeInTheDocument();
    // Badge "1" appears + one SVG cup
    expect(screen.getByText("1", { selector: "span[aria-hidden]" })).toBeInTheDocument();
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  it("440ml → '2 Cups' with badge '2' + one cup icon (not two)", () => {
    const { container } = render(<CupVisualization waterMl={440} />);
    expect(screen.getByText("fillConfirm.cups.multiple")).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "span[aria-hidden]" })).toBeInTheDocument();
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  it("275ml → '1 1/4 Cups' with badge '1' + quarter-filled cup icon", () => {
    const { container } = render(<CupVisualization waterMl={275} />);
    expect(screen.getByText("fillConfirm.cups.multiple")).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "span[aria-hidden]" })).toBeInTheDocument();
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  it("first-cup range (55–165ml) shows no count badge", () => {
    for (const ml of [55, 110, 165]) {
      const { container, unmount } = render(<CupVisualization waterMl={ml} />);
      const badge = container.querySelector("span[aria-hidden]");
      expect(badge).not.toBeInTheDocument();
      unmount();
    }
  });
});
