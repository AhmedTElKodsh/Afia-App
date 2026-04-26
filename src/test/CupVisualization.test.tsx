import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CupVisualization } from "../components/FillConfirmScreen/CupVisualization";

describe("CupVisualization — cup calibration 220ml = 1 cup", () => {
  it("0ml → '0 cups'", () => {
    render(<CupVisualization waterMl={0} />);
    expect(screen.getByText(/0\s*cups/i)).toBeInTheDocument();
  });

  it("55ml → '1/4 Cup' (one partial icon)", () => {
    render(<CupVisualization waterMl={55} />);
    expect(screen.getByText(/1\/4\s*cup/i)).toBeInTheDocument();
  });

  it("110ml → '1/2 Cup'", () => {
    render(<CupVisualization waterMl={110} />);
    expect(screen.getByText(/1\/2\s*cup/i)).toBeInTheDocument();
  });

  it("165ml → '3/4 Cup'", () => {
    render(<CupVisualization waterMl={165} />);
    expect(screen.getByText(/3\/4\s*cup/i)).toBeInTheDocument();
  });

  it("220ml → '1 Cup' (one full icon)", () => {
    render(<CupVisualization waterMl={220} />);
    expect(screen.getByText(/^1\s*cup$/i)).toBeInTheDocument();
  });

  it("440ml → '2 cups' (two full icons)", () => {
    const { container } = render(<CupVisualization waterMl={440} />);
    expect(screen.getByText(/2\s*cups/i)).toBeInTheDocument();
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("275ml → '1 1/4 cups' (1 full + 1 partial icon)", () => {
    const { container } = render(<CupVisualization waterMl={275} />);
    expect(screen.getByText(/1\s*1\/4\s*cups/i)).toBeInTheDocument();
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });
});
