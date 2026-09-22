---
name: live-it
description: Capture a personal story as a social post draft for the LIVE IT Engine. Use when the user says /live-it, or describes something that just happened that they might want to post about.
---

# Capture a LIVE IT story

Take everything the user said after `/live-it` and pass it verbatim as one
quoted argument:

```bash
npm run live-it -- "<their story, exactly as they told it>"
```

Do not rewrite, summarise, or tidy their words first — the agent is primed to
work from rough notes, and polishing them loses the detail that makes the
caption good.

Print the command's output back to the user as-is. It shows which bucket the
story was classified into, why, and the first caption. The draft is saved to
the Captured inbox — nothing is scheduled.

If the command fails because `ANTHROPIC_API_KEY` or `MONGODB_URI` is unset,
say which one and stop; do not try to work around it.
