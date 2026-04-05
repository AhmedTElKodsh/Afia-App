import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PrivacyNotice,
  hasAcceptedPrivacy,
} from "../components/PrivacyNotice.tsx";

describe("PrivacyNotice", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should render privacy notice with title and body", () => {
    const onAccepted = vi.fn();
    render(<PrivacyNotice onAccepted={onAccepted} />);

    expect(screen.getByText("Before Your First Scan")).toBeInTheDocument();
    expect(
      screen.getByText(/Scan images are stored to improve AI accuracy/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No personal information is collected/),
    ).toBeInTheDocument();
  });

  it("should show 'Learn more' button initially", () => {
    const onAccepted = vi.fn();
    render(<PrivacyNotice onAccepted={onAccepted} />);

    const learnMoreButton = screen.getByText("Learn more");
    expect(learnMoreButton).toBeInTheDocument();
  });

  it("should expand details when 'Learn more' is clicked", () => {
    const onAccepted = vi.fn();
    render(<PrivacyNotice onAccepted={onAccepted} />);

    const learnMoreButton = screen.getByText("Learn more");
    fireEvent.click(learnMoreButton);

    expect(
      screen.getByText(/When you photograph your oil bottle:/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The image is sent to our AI analysis server/),
    ).toBeInTheDocument();
    expect(screen.getByText("Show less")).toBeInTheDocument();
  });

  it("should collapse details when 'Show less' is clicked", () => {
    const onAccepted = vi.fn();
    render(<PrivacyNotice onAccepted={onAccepted} />);

    // Expand first
    const learnMoreButton = screen.getByText("Learn more");
    fireEvent.click(learnMoreButton);
    expect(screen.getByText("Show less")).toBeInTheDocument();

    // Collapse
    const showLessButton = screen.getByText("Show less");
    fireEvent.click(showLessButton);
    expect(screen.getByText("Learn more")).toBeInTheDocument();
    expect(
      screen.queryByText(/When you photograph your oil bottle:/),
    ).not.toBeInTheDocument();
  });

  it("should call onAccepted and set localStorage when 'I Understand' is clicked", () => {
    const onAccepted = vi.fn();
    render(<PrivacyNotice onAccepted={onAccepted} />);

    const acceptButton = screen.getByText("I Understand");
    fireEvent.click(acceptButton);

    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("afia_privacy_accepted")).toBe("true");
  });

  it("should have proper ARIA attributes", () => {
    const onAccepted = vi.fn();
    render(<PrivacyNotice onAccepted={onAccepted} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "privacy-title");

    const learnMoreButton = screen.getByText("Learn more");
    expect(learnMoreButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(learnMoreButton);
    expect(learnMoreButton).toHaveAttribute("aria-expanded", "true");
  });
});

describe("hasAcceptedPrivacy", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return false when privacy not accepted", () => {
    expect(hasAcceptedPrivacy()).toBe(false);
  });

  it("should return true when privacy accepted", () => {
    localStorage.setItem("afia_privacy_accepted", "true");
    expect(hasAcceptedPrivacy()).toBe(true);
  });

  it("should return false for any value other than 'true'", () => {
    localStorage.setItem("afia_privacy_accepted", "false");
    expect(hasAcceptedPrivacy()).toBe(false);

    localStorage.setItem("afia_privacy_accepted", "yes");
    expect(hasAcceptedPrivacy()).toBe(false);
  });
});
