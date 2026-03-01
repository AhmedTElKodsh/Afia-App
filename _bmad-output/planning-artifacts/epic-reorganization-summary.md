# Epic Reorganization Summary - User Value Sequence

## Overview

This document summarizes the reorganization of epics from technical sequence to user value sequence.

## New Epic Structure

### Epic 1: Core Scan Experience (End-to-End MVP)

**Goal:** Deliver complete working scan flow - QR → Camera → AI → Basic Result
**Stories:** 1.1-1.14 (14 stories)
**FRs Covered:** FR1, FR2, FR4-14, FR16-18, FR20-22

**Story Mapping:**

- 1.1: Project Foundation & PWA Setup (was 1.1)
- 1.2: Cloudflare Infrastructure Setup (was 1.2)
- 1.3: Bottle Registry & Nutrition Data (was 1.3)
- 1.4: QR Landing Page (was 1.4)
- 1.5: Camera Activation & Viewfinder (was 2.1)
- 1.6: Photo Capture & Preview (was 2.2)
- 1.7: Image Retake Flow (was 2.3)
- 1.8: Worker API Proxy - Analyze Endpoint (was 2.4)
- 1.9: Gemini Vision Integration (was 2.5)
- 1.10: Groq Fallback Integration (was 2.6)
- 1.11: AI Analysis Loading State (was 2.7)
- 1.12: Volume Calculation Engine (was 3.1)
- 1.13: Unit Conversion System (was 3.2)
- 1.14: Basic Result Display (was 3.7 - simplified)

### Epic 2: Rich Consumption Insights

**Goal:** Enhance result display with visuals and detailed nutrition
**Stories:** 2.1-2.7 (7 stories)
**FRs Covered:** FR19, FR21 (enhanced), FR22 (enhanced), FR23, FR24, FR39

**Story Mapping:**

- 2.1: Nutrition Calculator (was 3.3)
- 2.2: Fill Gauge Visual Component (was 3.4)
- 2.3: Volume Breakdown Display (was 3.5)
- 2.4: Nutrition Facts Panel (was 3.6)
- 2.5: Confidence Level Handling (was 2.8)
- 2.6: Confidence Indicator Integration (was 3.8)
- 2.7: Estimate Disclaimer (was 3.9)

### Epic 3: Continuous Improvement Loop

**Goal:** Collect feedback and training data
**Stories:** 3.1-3.8 (8 stories)
**FRs Covered:** FR26-33

**Story Mapping:**

- 3.1: Feedback Prompt UI (was 4.1)
- 3.2: Corrected Estimate Slider (was 4.2)
- 3.3: Feedback Submission Flow (was 4.3)
- 3.4: Worker Feedback Endpoint (was 4.4)
- 3.5: Feedback Validation Logic (was 4.5)
- 3.6: Image Storage to R2 (was 4.6)
- 3.7: Scan Metadata Storage (was 4.7)
- 3.8: Feedback Update to Metadata (was 4.8)

### Epic 4: Resilience & Edge Cases

**Goal:** Production-ready error handling
**Stories:** 4.1-4.8 (8 stories)
**FRs Covered:** FR15, FR25, FR34-38

**Story Mapping:**

- 4.1: Image Quality Issue Detection (was 2.9)
- 4.2: Low Confidence Retake Prompt (was 3.10)
- 4.3: AI Analysis Failure Handling (was 5.1)
- 4.4: Network Unavailability Detection (was 5.2)
- 4.5: iOS Browser Compatibility Check (was 5.3)
- 4.6: Camera Permission Denied Handling (was 5.4)
- 4.7: Privacy Notice - First Scan (was 5.5)
- 4.8: Estimate Accuracy Disclaimer (was 5.6 - REMOVED as duplicate of 2.7)

### Epic 5: Deployment & Operations

**Goal:** CI/CD and operational excellence
**Stories:** 5.1-5.2 (2 stories)
**FRs Covered:** FR3

**Story Mapping:**

- 5.1: Unknown Bottle Handling (was 1.5)
- 5.2: CI/CD Pipeline (was 1.6)

## Key Changes

1. **Epic 1 is now substantial** (14 stories) but delivers complete end-to-end value
2. **Epic 2 and 3 are independent** - can be developed in parallel after Epic 1
3. **Removed duplicate** - Story 5.6 was identical to 3.9 (now 2.7)
4. **Unknown bottle handling moved** to Epic 5 as it's edge case, not core flow
5. **CI/CD moved** to Epic 5 as operational concern, not foundation requirement

## Benefits of User Value Sequence

- Users get working scan flow after Epic 1
- Can validate POC hypothesis immediately
- Epic 2 and 3 can be prioritized based on user feedback
- Easier to pivot if POC doesn't validate
- Each epic delivers incremental business value
