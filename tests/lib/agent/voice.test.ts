import { describe, it, expect } from "vitest";
import { renderVoice, type VoiceProfile } from "@/lib/agent/voice";

const FULL: VoiceProfile = {
  whyItExists: "I built the thing I needed to start trusting myself again.",
  beliefs: ["Stop trying to convince yourself to believe. Build evidence."],
  enemy: "Passive consumption. Knowing without doing.",
  reader: "9pm on a bad Tuesday.",
  whyMine: "I stayed behind other people's brands.",
  wordsSheUses: ["Show up", "Proof"],
  wordsSheNeverUses: ["unlock your potential", "quantum leap"],
};

describe("renderVoice", () => {
  it("renders every section it is given", () => {
    const v = renderVoice(FULL);
    expect(v).toContain("I built the thing I needed");
    expect(v).toContain("Build evidence.");
    expect(v).toContain("Knowing without doing.");
    expect(v).toContain("9pm on a bad Tuesday");
    expect(v).toContain("behind other people's brands");
    expect(v).toContain("Show up · Proof");
    expect(v).toContain("unlock your potential · quantum leap");
  });

  it("returns an empty string when the profile is empty", () => {
    expect(renderVoice({})).toBe("");
  });

  it("omits absent sections without leaving blank gaps", () => {
    const v = renderVoice({ enemy: "Passive consumption." });
    expect(v).toContain("Passive consumption.");
    expect(v).not.toContain("# What she believes");
    expect(v).not.toMatch(/\n\n\n/);
  });

  it("puts why-it-exists before the vocabulary lists", () => {
    const v = renderVoice(FULL);
    expect(v.indexOf("Why this exists")).toBeLessThan(v.indexOf("Her vocabulary"));
  });
});
