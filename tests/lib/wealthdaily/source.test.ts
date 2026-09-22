import { describe, it, expect, beforeEach, vi } from "vitest";

describe("wealthdaily source with no connection configured", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.WEALTH_DAILY_DATABASE_URL;
    delete (globalThis as { _wdSql?: unknown })._wdSql;
  });

  it("returns empty lists rather than throwing", async () => {
    const s = await import("@/lib/wealthdaily/source");
    expect(await s.getTodaysCardCandidates()).toEqual([]);
    expect(await s.getDeckCatalogue()).toEqual([]);
    expect(await s.getRecentlyShipped()).toEqual([]);
    expect(await s.getProofCandidates()).toEqual([]);
    expect(await s.getAuthorSignals()).toEqual([]);
    expect(await s.getCoverageGaps([])).toEqual([]);
  });

  it("reports that it is not connected", async () => {
    const { isConnected } = await import("@/lib/wealthdaily/client");
    expect(isConnected()).toBe(false);
  });

  it("returns null from getAggregateSignals, which dev data cannot answer", async () => {
    const s = await import("@/lib/wealthdaily/source");
    expect(await s.getAggregateSignals()).toBeNull();
  });
});
