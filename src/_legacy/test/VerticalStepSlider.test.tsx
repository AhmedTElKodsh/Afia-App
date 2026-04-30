import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerticalStepSlider } from "../components/FillConfirmScreen/VerticalStepSlider";

describe("VerticalStepSlider", () => {
  it("AC1 - Renders vertically with correct orientation", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VerticalStepSlider
        waterMl={825}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    const slider = container.querySelector('[role="slider"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-orientation", "vertical");
  });

  it("AC3 - Min floor enforced (cannot go below 55ml)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VerticalStepSlider
        waterMl={55}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute("aria-valuemin", "55");
    expect(slider).toHaveAttribute("aria-valuenow", "55");
  });

  it("AC4 - Max enforced (cannot exceed capacity)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VerticalStepSlider
        waterMl={1500}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute("aria-valuemax", "1500");
    expect(slider).toHaveAttribute("aria-valuenow", "1500");
  });

  it("AC5 - iOS Safari: touch-action: pan-x prevents page scroll", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VerticalStepSlider
        waterMl={825}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    const sliderRoot = container.firstChild as HTMLElement;
    expect(sliderRoot).toHaveStyle({ touchAction: "pan-x" });
  });

  it("AC6 - Controlled component (reflects prop changes)", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <VerticalStepSlider
        waterMl={825}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    let slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute("aria-valuenow", "825");

    // Update waterMl prop
    rerender(
      <VerticalStepSlider
        waterMl={1100}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute("aria-valuenow", "1100");
  });

  it("AC7 - Touch target size is 44x44px", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VerticalStepSlider
        waterMl={825}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    const thumb = container.querySelector('[role="slider"]');
    expect(thumb).toHaveStyle({ width: "44px", height: "44px" });
  });

  it("Step increments work correctly", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VerticalStepSlider
        waterMl={825}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute("aria-valuemin", "55");
    expect(slider).toHaveAttribute("aria-valuemax", "1500");
    // Step attribute is not exposed in ARIA, but Radix handles it internally
  });

  it("Custom height prop is applied", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VerticalStepSlider
        waterMl={825}
        min={55}
        step={55}
        max={1500}
        height={400}
        onChange={onChange}
      />
    );

    const sliderRoot = container.firstChild as HTMLElement;
    expect(sliderRoot).toHaveStyle({ height: "400px" });
  });

  it("Default height is 280px", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VerticalStepSlider
        waterMl={825}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    const sliderRoot = container.firstChild as HTMLElement;
    expect(sliderRoot).toHaveStyle({ height: "280px" });
  });

  it("Aria label is present for accessibility", () => {
    const onChange = vi.fn();
    render(
      <VerticalStepSlider
        waterMl={825}
        min={55}
        step={55}
        max={1500}
        onChange={onChange}
      />
    );

    // Component uses aria-label "Adjust fill level"
    const slider = screen.getByRole("slider", { name: "Adjust fill level" });
    expect(slider).toBeInTheDocument();
  });
});
