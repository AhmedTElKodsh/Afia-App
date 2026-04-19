# Gemini API Stability Tracking

**Created**: 2026-04-17  
**Owner**: Technical Team  
**Priority**: Medium (Monitor)  
**Related**: Deferred Work Item W2

## Overview

The Afia Oil Tracker uses Google's Gemini 2.5 Flash model for bottle image analysis. Two known trade-offs exist that may impact accuracy and stability:

1. **Thinking Budget Disabled** (`thinkingBudget: 0`)
2. **Beta API Endpoint** (`v1beta`)

This document tracks these issues and monitors for resolution opportunities.

---

## Issue 1: Thinking Budget Disabled

### Current State
```typescript
// worker/src/providers/gemini.ts
thinkingBudget: 0,  // Disabled to prevent CPU timeout
```

### Reason
Gemini 2.5 Flash enables "thinking tokens" by default, which can exceed Cloudflare Workers' 30-second CPU limit, causing the entire analysis chain to fail.

### Impact
- **Positive**: Prevents timeout failures, ensures system reliability
- **Negative**: Reasoning quality may degrade on ambiguous/edge-case images

### Mitigation
- Multi-key failover implemented (tries each API key sequentially)
- System continues to function with reduced reasoning quality
- User feedback mechanism captures problematic cases

### Action Items
- [ ] Monitor user feedback for accuracy issues on ambiguous images
- [ ] Evaluate Cloudflare Workers CPU limit optimization (e.g., streaming responses, chunked processing)
- [ ] Test `thinkingBudget: 1` or `thinkingBudget: 2` in staging to measure impact
- [ ] Consider alternative deployment platforms if CPU limits remain blocking

### Success Criteria
- Re-enable thinking tokens without exceeding CPU limits
- Maintain <5% timeout rate on production requests

---

## Issue 2: Beta API Endpoint

### Current State
```typescript
// worker/src/providers/gemini.ts
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
```

### Reason
Gemini 2.5 Flash is only available on the `v1beta` endpoint. The stable `v1` endpoint does not yet support this model.

### Impact
- **Positive**: Access to latest Gemini 2.5 Flash features and performance
- **Negative**: Weaker stability guarantees, potential breaking changes without notice

### Mitigation
- Multi-key failover implemented
- Error handling and retry logic in place
- Monitoring for API changes via Google AI release notes

### Action Items
- [ ] Monitor Google AI release notes for Gemini 2.5 Flash `v1` stable availability
- [ ] Subscribe to Google AI developer announcements
- [ ] Test migration to `v1` endpoint when available
- [ ] Evaluate alternative models if `v1beta` becomes unstable

### Success Criteria
- Migrate to `v1` stable endpoint when Gemini 2.5 Flash is promoted
- Maintain <1% API error rate on production requests

---

## Monitoring Plan

### Metrics to Track
1. **API Error Rate**: % of requests failing due to Gemini API issues
2. **Timeout Rate**: % of requests exceeding Cloudflare Workers CPU limit
3. **User Feedback**: Reports of inaccurate analysis on ambiguous images
4. **API Latency**: P50, P95, P99 response times from Gemini API

### Review Cadence
- **Weekly**: Check error logs and user feedback
- **Monthly**: Review metrics dashboard and assess action items
- **Quarterly**: Evaluate alternative LLM providers and deployment platforms

### Escalation Criteria
- API error rate >5% for 24 hours → Investigate alternative providers
- Timeout rate >10% for 24 hours → Investigate CPU optimization or platform migration
- User feedback indicates >10% accuracy issues → Re-evaluate `thinkingBudget` trade-off

---

## Alternative Solutions (Future Consideration)

### Option 1: Streaming Responses
- Stream Gemini API responses to reduce CPU time per chunk
- Requires Cloudflare Workers streaming API support
- **Effort**: High | **Impact**: High

### Option 2: Alternative Deployment Platform
- Migrate to platform with higher CPU limits (e.g., AWS Lambda, Google Cloud Run)
- Allows re-enabling thinking tokens
- **Effort**: Very High | **Impact**: High

### Option 3: Alternative LLM Provider
- Evaluate Claude 3.5 Sonnet, GPT-4 Vision, or other vision models
- Compare accuracy, latency, and cost
- **Effort**: Medium | **Impact**: Medium

### Option 4: Hybrid Approach
- Use lightweight model for initial triage (fast, low CPU)
- Route ambiguous cases to full Gemini with thinking tokens (slower, high CPU)
- **Effort**: High | **Impact**: Medium

---

## Change Log

| Date       | Change                                      | Author |
|------------|---------------------------------------------|--------|
| 2026-04-17 | Initial tracking document created           | System |

