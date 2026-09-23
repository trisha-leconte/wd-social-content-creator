export type VoiceProfile = {
  whyItExists?: string;
  beliefs?: string[];
  enemy?: string;
  reader?: string;
  whyMine?: string;
  wordsSheUses?: string[];
  wordsSheNeverUses?: string[];
};

/**
 * Who Trisha is, before any rule about how to write. Shared by the social
 * and blog agents so one edit to her beliefs changes both. Every section is
 * optional and an absent one contributes nothing — no stray blank lines.
 */
export function renderVoice(p: VoiceProfile): string {
  const sections: string[] = [];

  if (p.whyItExists) sections.push(`# Why this exists at all\n${p.whyItExists}`);
  if (p.beliefs?.length)
    sections.push(`# What she believes\n${p.beliefs.map((b) => `- ${b}`).join("\n")}`);
  if (p.enemy) sections.push(`# What the movement is against\n${p.enemy}`);
  if (p.reader) sections.push(`# Who she is writing to\n${p.reader}`);
  if (p.whyMine) sections.push(`# Why this is hers to build\n${p.whyMine}`);
  if (p.wordsSheUses?.length)
    sections.push(`# Her vocabulary — reach for these\n${p.wordsSheUses.join(" · ")}`);
  if (p.wordsSheNeverUses?.length)
    sections.push(
      `# Never these — she closes the tab on them\n${p.wordsSheNeverUses.join(" · ")}`
    );

  return sections.join("\n\n");
}
