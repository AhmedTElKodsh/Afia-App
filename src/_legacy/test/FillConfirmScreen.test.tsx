import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FillConfirmScreen } from "../components/FillConfirmScreen/FillConfirmScreen";

// Minimal props for a bottle with 550ml current level (10 × 55ml steps)
const BASE_PROPS = {
  imageDataUrl: "data:image/png;base64,abc",
  aiEstimatePercent: 55,   // 55% of 1000ml = 550ml
  bottleCapacityMl: 1000,
  bottleTopPct: 0.1,
  bottleBottomPct: 0.9,
  onConfirm: vi.fn(),
  onRetake: vi.fn(),
};

// Props for a nearly-empty bottle (≤55ml → disabled)
const DISABLED_PROPS = {
  ...BASE_PROPS,
  aiEstimatePercent: 3,   // 3% of 1000ml = 30ml → snaps to 0 → disabled
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FillConfirmScreen — Gap 1: slider semantics (taken-out, not remaining)", () => {
  it("slider starts at maxTaken (thumb at top = 0ml taken)", () => {
    const { container } = render(<FillConfirmScreen {...BASE_PROPS} />);
    const slider = container.querySelector('[role="slider"]');
    // currentLevelMl = round(550 / 55) * 55 = 550; maxTaken = 550 - 55 = 495
    // Initial inverted slider value = maxTaken - 0 = 495
    expect(slider).toHaveAttribute("aria-valuenow", "495");
    expect(slider).toHaveAttribute("aria-valuemax", "495");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
  });
});

describe("FillConfirmScreen — Gap 2: display text", () => {
  it("shows 'You're taking out' and 'Will remain' rows", () => {
    render(<FillConfirmScreen {...BASE_PROPS} />);
    expect(screen.getByTestId("taking-out-text")).toBeInTheDocument();
    expect(screen.getByTestId("will-remain-text")).toBeInTheDocument();
  });

  it("initially shows 0ml taking out and full currentLevel remaining", () => {
    render(<FillConfirmScreen {...BASE_PROPS} />);
    // takenMl=0, remainingMl=550
    const takingOut = screen.getByTestId("taking-out-text");
    const willRemain = screen.getByTestId("will-remain-text");
    expect(takingOut.textContent).toMatch(/0\s*ml/);
    expect(willRemain.textContent).toMatch(/550\s*ml/);
  });

  it("confirm button label shows remaining ml", () => {
    render(<FillConfirmScreen {...BASE_PROPS} />);
    const btn = screen.getByTestId("confirm-button");
    expect(btn.textContent).toMatch(/550\s*ml/);
  });
});

describe("FillConfirmScreen — Gap 3: edge case <55ml remaining", () => {
  it("shows disabled message when bottle has ≤55ml", () => {
    render(<FillConfirmScreen {...DISABLED_PROPS} />);
    expect(screen.getByTestId("disabled-message")).toBeInTheDocument();
  });

  it("hides slider when disabled", () => {
    const { container } = render(<FillConfirmScreen {...DISABLED_PROPS} />);
    expect(container.querySelector('[role="slider"]')).not.toBeInTheDocument();
  });
});

describe("FillConfirmScreen — Gap 4: haptic feedback", () => {
  it("calls navigator.vibrate on slider change if supported", () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    const { container } = render(<FillConfirmScreen {...BASE_PROPS} />);
    const slider = container.querySelector('[role="slider"]') as HTMLElement;

    // Simulate keyboard decrement (Radix fires onValueChange)
    fireEvent.keyDown(slider, { key: "ArrowDown" });

    expect(vibrateMock).toHaveBeenCalled();
  });
});

describe("FillConfirmScreen — Gap 5: onConfirm passes remainingMl", () => {
  it("passes remainingMl (currentLevel - taken) to onConfirm", () => {
    const onConfirm = vi.fn();
    render(<FillConfirmScreen {...BASE_PROPS} onConfirm={onConfirm} />);
    // takenMl=0 initially → remainingMl = 550
    fireEvent.click(screen.getByTestId("confirm-button"));
    expect(onConfirm).toHaveBeenCalledWith(550);
  });
});
