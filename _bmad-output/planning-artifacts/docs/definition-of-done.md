# Definition of Done — Safi Oil Tracker

**Version:** POC v1

---

## Story-Level Definition of Done

A story is considered "Done" when ALL of the following criteria are met:

### Code Quality

- [ ] Code follows project conventions (ESLint, Prettier)
- [ ] No console.log statements in production code
- [ ] TypeScript types are explicit (no `any` unless justified)
- [ ] Functions are single-purpose and well-named
- [ ] Magic numbers extracted to named constants
- [ ] Error handling implemented for all failure paths

### Testing

- [ ] Unit tests written for all pure functions
- [ ] Unit tests pass: `npm test`
- [ ] Test coverage ≥ 80% for new code
- [ ] E2E tests written for user-facing flows (where applicable)
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Manual testing completed on target devices (iOS Safari, Android Chrome)

### Documentation

- [ ] Code comments added for complex logic
- [ ] API contracts documented (if story adds/modifies endpoints)
- [ ] Data schemas documented (if story adds/modifies data structures)
- [ ] README updated (if story changes setup/deployment)

### Acceptance Criteria

- [ ] All Given/When/Then acceptance criteria from story are met
- [ ] Edge cases handled (empty states, errors, boundary values)
- [ ] Accessibility requirements met (WCAG 2.1 AA)
- [ ] Performance requirements met (latency, bundle size)

### Code Review

- [ ] Pull request created with clear description
- [ ] Code reviewed by at least one team member
- [ ] All review comments addressed
- [ ] PR approved by reviewer

### Deployment

- [ ] Code merged to `main` branch
- [ ] CI/CD pipeline passes (GitHub Actions)
- [ ] Deployed to staging environment
- [ ] Smoke tests pass in staging
- [ ] Deployed to production (auto-deploy from `main`)

### Verification

- [ ] Story demo completed (show working feature)
- [ ] Product Owner accepts the story
- [ ] No known bugs or regressions introduced

---

## Epic-Level Definition of Done

An epic is considered "Done" when ALL of the following criteria are met:

### Story Completion

- [ ] All stories in the epic are marked "Done"
- [ ] Epic delivers complete user value (not partial functionality)
- [ ] Integration between stories is tested and working

### Documentation

- [ ] Epic-level documentation updated (if applicable)
- [ ] User-facing documentation written (if applicable)
- [ ] Technical documentation complete (architecture, API, data)

### Testing

- [ ] End-to-end testing across all epic stories
- [ ] Performance testing for epic-level flows
- [ ] Accessibility testing for epic-level features
- [ ] Cross-browser testing (iOS Safari, Android Chrome, Desktop)

### Acceptance

- [ ] Epic demo completed with stakeholders
- [ ] Product Owner accepts the epic
- [ ] User feedback collected (if applicable)

---

## Release-Level Definition of Done

A release (POC v1) is considered "Done" when ALL of the following criteria are met:

### Feature Completeness

- [ ] All epics in release scope are marked "Done"
- [ ] All must-have features are implemented and working
- [ ] All known critical bugs are fixed

### Quality Assurance

- [ ] Full regression testing completed
- [ ] Performance benchmarks met (8-10s latency, bundle size < 200KB)
- [ ] Security audit completed (API keys, rate limiting, origin validation)
- [ ] Accessibility audit completed (WCAG 2.1 AA)

### Documentation

- [ ] User documentation complete
- [ ] Technical documentation complete
- [ ] Deployment guide complete
- [ ] API documentation complete

### Deployment

- [ ] Production deployment successful
- [ ] Smoke tests pass in production
- [ ] Monitoring and logging configured
- [ ] Rollback procedure tested

### Stakeholder Acceptance

- [ ] Product Owner accepts the release
- [ ] Stakeholder demo completed
- [ ] Success criteria validated (from PRD)

---

## Code Review Checklist

Reviewers should verify:

### Functionality

- [ ] Code implements the story acceptance criteria
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logic errors

### Code Quality

- [ ] Code is readable and maintainable
- [ ] Functions are appropriately sized (< 50 lines)
- [ ] Variable names are descriptive
- [ ] No code duplication (DRY principle)
- [ ] TypeScript types are explicit and correct

### Testing

- [ ] Tests are present and meaningful
- [ ] Tests cover happy path and edge cases
- [ ] Tests are not brittle (don't test implementation details)
- [ ] Test names clearly describe what is being tested

### Security

- [ ] No API keys or secrets in code
- [ ] User input is validated
- [ ] SQL injection / XSS vulnerabilities addressed (if applicable)
- [ ] Rate limiting implemented (if applicable)

### Performance

- [ ] No obvious performance issues
- [ ] Large data sets handled efficiently
- [ ] Images/assets optimized
- [ ] Bundle size impact is acceptable

### Accessibility

- [ ] Semantic HTML used
- [ ] ARIA labels present where needed
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG 2.1 AA

---

## Testing Standards

### Unit Tests

**What to test:**

- Pure functions (volume calculator, nutrition calculator, unit converter)
- Validation logic (feedback validator, input validators)
- Utility functions (image compressor, data formatters)

**What NOT to test:**

- React component rendering (use E2E tests instead)
- Third-party library behavior
- Trivial getters/setters

**Test structure:**

```typescript
describe("volumeCalculator", () => {
  describe("calculateCylinderVolume", () => {
    it("should calculate volume for 50% fill level", () => {
      const result = calculateCylinderVolume(50, 220, 65);
      expect(result).toBeCloseTo(250, 1); // 250ml ± 0.1ml
    });

    it("should handle 0% fill level", () => {
      const result = calculateCylinderVolume(0, 220, 65);
      expect(result).toBe(0);
    });

    it("should handle 100% fill level", () => {
      const result = calculateCylinderVolume(100, 220, 65);
      expect(result).toBeCloseTo(500, 1);
    });
  });
});
```

### E2E Tests

**What to test:**

- Critical user flows (QR → camera → result → feedback)
- Error states (camera denied, network offline, API failure)
- Cross-browser compatibility (iOS Safari, Android Chrome)

**Test structure:**

```typescript
test("complete scan flow", async ({ page }) => {
  // Navigate to QR landing page
  await page.goto("/?sku=filippo-berio-500ml");

  // Verify bottle info displayed
  await expect(page.locator("h1")).toContainText("Filippo Berio");

  // Start scan (mock camera in test)
  await page.click('button:has-text("Start Scan")');

  // Mock camera capture
  await page.evaluate(() => {
    // Inject mock camera stream
  });

  // Capture photo
  await page.click('button:has-text("Capture")');

  // Verify result displayed
  await expect(page.locator(".fill-percentage")).toBeVisible();

  // Submit feedback
  await page.click('button:has-text("About right")');
  await expect(page.locator(".thank-you")).toBeVisible();
});
```

---

## Deployment Checklist

Before deploying to production:

### Pre-Deployment

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] Merged to `main` branch
- [ ] CI/CD pipeline passes
- [ ] Staging deployment successful
- [ ] Smoke tests pass in staging

### Deployment

- [ ] Production deployment triggered
- [ ] Deployment completes without errors
- [ ] Health check endpoint returns 200 OK
- [ ] Smoke tests pass in production

### Post-Deployment

- [ ] Monitor error logs for 15 minutes
- [ ] Verify key metrics (request count, latency, error rate)
- [ ] Test critical user flows manually
- [ ] Notify stakeholders of deployment

### Rollback Criteria

Rollback immediately if:

- Error rate > 5% of requests
- p95 latency > 15 seconds
- Critical feature is broken
- Security vulnerability discovered

---

## Acceptance Criteria Format

All stories must use Given/When/Then format:

```
**Given** <precondition>
**When** <action>
**Then** <expected outcome>
**And** <additional criteria>
```

**Example:**

```
**Given** I am on the QR landing page
**When** I tap "Start Scan"
**Then** the rear-facing camera activates
**And** I see a live viewfinder
**And** the camera activates in under 2 seconds
```

---

## Story Sizing Guidelines

Stories should be sized to be completable by a single developer in 1-3 days:

- **Small (1 day):** Simple UI component, pure function, configuration change
- **Medium (2 days):** Feature with UI + logic + tests, API endpoint, integration
- **Large (3 days):** Complex feature with multiple components, E2E flow

**If a story is larger than 3 days, it should be split into smaller stories.**

---

## Working Agreement

### Communication

- Daily standup at 9:00 AM (async in Slack if remote)
- Code reviews completed within 24 hours
- Blockers escalated immediately
- Questions asked in team channel (not DMs)

### Code Standards

- ESLint + Prettier enforced (pre-commit hook)
- TypeScript strict mode enabled
- No `any` types without justification comment
- All functions have JSDoc comments

### Git Workflow

- Branch naming: `feature/<story-id>-<short-description>`
- Commit messages: `<type>: <description>` (e.g., `feat: add camera capture`)
- Pull requests: Link to story, include screenshots/video for UI changes
- Squash commits when merging to `main`

### Testing

- Write tests before or alongside code (TDD encouraged)
- Tests must pass before PR is created
- E2E tests run in CI/CD pipeline
- Manual testing on real devices before marking story "Done"

---

## Success Metrics

Track these metrics to validate POC success:

### User Metrics

- Scan completion rate: ≥ 80%
- Feedback submission rate: ≥ 30%
- Average time to result: < 10 seconds (p95)

### Technical Metrics

- API latency (p95): < 10 seconds
- Error rate: < 2%
- LLM accuracy (MAE): ≤ 15%
- Feedback acceptance rate: ≥ 60%

### Business Metrics

- Total scans collected: ≥ 50 in first month
- Training-eligible records: ≥ 30 in first month
- Infrastructure cost: $0/month

**Review metrics weekly and adjust if targets are not being met.**
