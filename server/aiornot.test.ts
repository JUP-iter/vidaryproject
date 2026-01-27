import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("AI or Not API Key Validation", () => {
  it("should have AIORNOT_API_KEY configured", () => {
    expect(ENV.aiOrNotApiKey).toBeDefined();
    expect(ENV.aiOrNotApiKey).not.toBe("");
    expect(ENV.aiOrNotApiKey?.length).toBeGreaterThan(0);
  });

  it("should validate API key format", () => {
    const apiKey = ENV.aiOrNotApiKey;
    // AI or Not API keys are JWT tokens with dots separating parts
    expect(apiKey).toMatch(/^[a-zA-Z0-9_.-]+$/);
  });
});
