# The LIVE IT Engine — design

Date: 2026-09-22
Status: approved, ready for implementation planning
Owner: Trisha (sole user)

---

## 1. The problem

Trisha runs Wealth Daily and never knows what to post. The underlying cause is
not a lack of ideas — it is that three things are being promoted at once (the
app, the LIVE IT movement, and the platform for authors and coaches), so every
post starts with an unresolved question about who it is for.

The strategy that resolves this already exists and is settled: the feed is the
public documentation of LIVE IT, and Wealth Daily is the tool visible
underneath. One story, two invitations. Four buckets, six named series, four
posts a week.

This app's only job is to make that strategy operational, so that opening it
answers **"what am I posting today, and what do I say?"** without a decision.

It is not a social media manager, a scheduler, or an analytics tool.

## 2. Users and scope

Single user: Trisha. One seeded account, no registration, no roles.

Platforms the drafts target: Instagram, LinkedIn, Facebook/Threads.

**In scope for v1**

- A private site behind a login that assigns the week and drafts captions.
- An AI agent primed on the strategy, grounded in real Wealth Daily content.
- A command-line capture path for stories that happen off-schedule.
- A read-only connection to the Wealth Daily **development** Postgres database.

**Explicitly out of scope for v1**

| Left out | Why |
| --- | --- |
| Publishing to Instagram/LinkedIn/etc. | The problem is knowing what to say, not the mechanics of posting. An integration would add OAuth, token refresh and rate limits for no gain. |
| Image and video generation | Different tool. The agent recommends the visual; Trisha shoots it. |
| Media library / asset storage | Photos stay on the phone. |
| Analytics ingestion (followers, reach, engagement) | The app measures one thing: did she post, and was the mix right. |
| Multi-user, roles, approvals | One login. |
| Reader-consent workflow for proof | Unnecessary — the dev database contains no private reader data at all (§7). |

## 3. The single story

Seeded as the root of the strategy profile, and present in every agent call:

> I spent years consuming personal development. Now I'm experimenting with
> actually living it. I built Wealth Daily to help me do that. I'm inviting
> other people to LIVE IT with me — and I'm helping authors and coaches turn
> their teachings into things people can actually practice.

A consumer reads that and thinks *"I want to do this."* An author reads it and
thinks *"I want my audience doing this with MY work."*

**Design consequence:** the app never asks which audience a post is for. It
asks which *lens* — "here's something you can LIVE" versus "here's what YOUR
audience could LIVE". Same story, different invitation. Lens is a property of
a post, not a separate content track.

## 4. Domain model (MongoDB / Mongoose)

All of this is seeded by `npm run seed` and editable in the UI. The seed is
what makes the app useful on first run.

### `StrategyProfile` (singleton)

The brain. One document. Fields: `oneStory`, `audiences[]`, `voiceRules[]`,
`doNotList[]`, `ctaRotation[]`, `openerBank[]`, `profileBio`, `pinnedPosts[3]`.

### `Bucket`

| key | name | target |
| --- | --- | --- |
| `LIVING_IT` | I'M LIVING IT | 40% |
| `PEOPLE_LIVING_IT` | PEOPLE ARE LIVING IT | 25% |
| `THE_IDEA` | THE IDEA | 20% |
| `BEHIND_THE_WORLD` | BEHIND THE WORLD | 15% |

Each carries `description`, `whatItIsNot`, and a display `color`.

### `Series`

Six, each belonging to a bucket, each with `promptQuestions[]`,
`structureSkeleton`, and `examples[]` taken verbatim from Trisha's own writing.

| Series | Bucket |
| --- | --- |
| TODAY I LIVED IT | LIVING_IT |
| SOMEONE LIVED IT | PEOPLE_LIVING_IT |
| TRY THIS | THE_IDEA |
| FROM PAGE → PRACTICE | THE_IDEA |
| BUILDING WEALTH DAILY | BEHIND_THE_WORLD |
| IMAGINE YOUR IP LIKE THIS | BEHIND_THE_WORLD |

### `WeeklySlot`

`dayOfWeek` → `bucketKey` + `defaultSeriesKey`. Seeded Mon/Tue/Thu/Sat
(LIVE IT / THE IDEA / PROOF / BUILDING). Editable; the schedule is a decision
made once, not weekly.

### `Post`

`date`, `slotKey`, `bucketKey`, `seriesKey`, `lens` (`consumer` | `creator`),
`rawNotes`, `sourceCardRef` (optional, §7), `generations[]` (every agent
response, kept), `chosenCaption`, `platformVariants{}`, `suggestedVisual`,
`storyVersion`, `cta`, `status`
(`idea` | `captured` | `drafted` | `ready` | `posted` | `skipped`),
`postedAt`, `platforms[]`.

A capture from the CLI is a `Post` with `status: captured` and no `slotKey`
until placed. There is no separate collection — "Captured" is a view.

### `StoryPrompt`

The Stories nudge bank ("walking Lolo? take a picture"). No schedule, shuffled.

## 5. Voice and craft rules — how the agent is primed

This is the highest-leverage part of the system. These rules are **seeded data
on the `StrategyProfile`**, rendered into every prompt, and editable at
`/strategy`. They are not buried in code.

### Structure

1. **Open on the resistance, not the lesson.** The canonical skeleton is
   assignment → resistance → did it anyway → what happened. The resistance is
   the hook because it is the universally recognisable part.
2. **Never explain the moral.** The reader supplies it. Bucket 1 is
   documentation, not teaching.
3. **End on an open loop.** Stop one beat before the conclusion.
4. **Short lines with real white space**, matching how Trisha already writes.

### Content

5. **Specific nouns over summary.** "Trader Joe's", not "the store".
   "$3,000 check", not "unexpected money".
6. **Use escalation ladders where the story has one** (pennies → $1 → $20 →
   $3,000).
7. **Mundane is an asset.** The movement is believable because the evidence is
   ordinary. Never inflate a small result.
8. **Self-deprecation is the trust mechanism.** The 😂 at her own resistance
   is a rule, not an accident — it is what stops the post reading as preachy.
9. **Emoji sparingly, as tone, never as decoration or section markers.**

### The ask

10. **The CTA is an invitation, never a platform instruction.** It must be a
    question a friend would ask, answerable in roughly four words, and about
    the reader rather than about Trisha.

    | Required shape | Forbidden |
    | --- | --- |
    | "What did YOU live today?" | "Comment below!" |
    | "Which one are you avoiding?" | "What's your biggest struggle with personal development?" |
    | "Send this to whoever needs to do it with you." | "Tag a friend! 👇" |
    | "Save this and actually DO it." | "Double tap if you agree!" |

11. **Rotate the CTA.** Never the same one twice running; chosen from
    `ctaRotation` against the last posted CTAs.

### Hard prohibitions (`doNotList`)

12. No feature-advertising voice. "WEALTH DAILY HAS STREAKS!",
    "DOWNLOAD MY APP!", "AUTHORS — JOIN MY PLATFORM!" are named in the prompt
    as the failure mode. Features are demonstrated by showing the evidence
    ("Day 6. ✓ … I'm collecting these in Wealth Daily because apparently I
    need receipts that I'm actually changing 😂"), never announced.
13. No teaching-voice openers: "Here's what I learned…", "3 things this taught
    me", "Remember:".
14. No corporate B2B register in BEHIND THE WORLD. The creator pitch arrives
    as "this is my favourite part", not as a value proposition.

### Repetition guard

15. **Opener rotation is a hard constraint.** The agent receives the openers
    of the last eight posts and may not reuse their shape. Monday cannot
    always begin "Today's card told me to…".

## 6. The agent

`POST /api/agent/draft`, server-side only, `@anthropic-ai/sdk`, model
`claude-opus-5`, adaptive thinking, and structured output via
`client.messages.parse()` with `zodOutputFormat` — not a hand-rolled tool
definition. The stable half of the prompt (strategy brain, bucket, series) is
marked `cache_control: {type: "ephemeral"}` so repeated drafting in a session
reuses the cached prefix.

**Prompt assembly** (one module, unit-tested):

- `StrategyProfile` — one story, voice rules, do-not list, CTA rotation
- the target `Bucket` (including `whatItIsNot`)
- the target `Series` — prompt questions, skeleton, verbatim examples
- the chosen `lens`
- real Wealth Daily context where available (§7) — the actual card text, deck
  and chapter, or the product that just shipped
- the last 8 posted captions, for voice continuity and the opener guard
- the user message: Trisha's raw notes

**Response contract:**

```
captions[3]        — full drafts, each a different structural angle
hooks[3]           — alternative opening lines
cta                — selected from rotation, with the reason it fits
platformVariants   — instagram | linkedin | facebook_threads
suggestedVisual    — what to photograph or record
storyVersion       — the messy Stories-layer version
```

Every generation is appended to `Post.generations[]` and never discarded.

**Classification** (used by the CLI capture): the same endpoint with no bucket
supplied returns a `bucketKey` and `seriesKey` alongside the drafts.

## 7. The Wealth Daily data source

One module — `src/lib/wealthdaily/` — is the only code that knows the v2
Postgres schema. Connects via `WEALTH_DAILY_DATABASE_URL` to a **read-only
role on the development database**, using the `postgres` client with raw
tagged-template SQL. Deliberately no Drizzle schema copy: duplicating 2,580
lines of v2 schema would be a second thing to keep in sync, and `check:source`
(below) catches drift more cheaply.

### Why the dev database

`scripts/setup-dev-db.ts` in `wealth-daily-landing-v2` copies exactly twenty
content tables from live and deliberately copies no people. Consequences:

- **Real and available:** `products`, `levels`, `activities`,
  `activity_fields`, `cards`, `card_groups`, `guides`, `collections`, `tags`,
  `coaches`, `testimonials`, sticker and tool tables.
- **Absent by design:** `users`, `book_checkouts`, `book_checkins`,
  `card_entries`, `ratings`, deck memories, groups and crew feeds, orders,
  subscriptions, `build_requests`.

So there is no path by which the agent could surface a reader's private
writing, because that data is not in the database it reads. Combined with a
read-only role, there is likewise no path by which it could alter the live
store. This is structural, not policy.

### Interface

```
getTodaysCardCandidates()  → real card text, with deck + chapter provenance
getDeckCatalogue()         → decks, chapters and card counts for the picker
getRecentlyShipped()       → products flagged new / featured / coming soon
getProofCandidates()       → published testimonials
getAuthorSignals()         → coaches and author-owned products (anonymised)
getCoverageGaps()          → decks/books with no post referencing them
getAggregateSignals()      → returns null in v1 (no reader activity in dev)
```

`getAggregateSignals()` exists and returns `null` so that repointing at live
later lights it up with no other change.

### Degradation

If `WEALTH_DAILY_DATABASE_URL` is missing or the connection fails, every
screen still functions; the app falls back to generic prompts and the card
picker is replaced by a free-text field. The app is never hostage to a
database it does not own.

### Schema drift

`npm run check:source` runs every adapter query with `LIMIT 1` and reports
which broke. Run it after any v2 migration. Adapter tests run against a
fixture, never a live connection.

## 8. Screens

| Route | Purpose |
| --- | --- |
| `/login` | Email + password. Seeded account only. |
| `/` **Today** | Today's assignment, this week's four slots with status, the Captured inbox, the real-vs-target mix meter, Stories nudge shuffle. |
| `/post/[id]` **Write** | Card picker → prompt questions → raw notes → lens toggle (consumer / creator) → generate → variants, hooks, CTA → platform tabs → mark posted. Defaults to `consumer`; BEHIND THE WORLD defaults to `creator`. |
| `/captured` | Loose CLI-captured drafts, bucket-classified, awaiting placement. |
| `/proof` | Testimonial library plus manually logged wins. |
| `/coverage` | Every deck, book and chapter with last-posted-about date; neglected ones flagged. |
| `/library` | Buckets, series, examples, hook bank, CTA rotation, bio, three pinned-post briefs. |
| `/calendar` | Month view, colour-coded by bucket. |
| `/strategy` | Edit the brain — voice rules, do-not list, CTAs, openers. |

## 9. Command-line capture

Entry point: a Claude Code skill in this project, `/live-it <story>`, backed by
`scripts/capture.ts`.

Flow: raw story text → connect to MongoDB directly (the web server need not be
running) → call the agent with no bucket supplied → receive classification plus
drafts → write a `Post` with `status: captured` → print the bucket, series and
first draft to the terminal.

The post appears on `/` under **Captured** immediately, because both paths
write the same collection. Nothing captured is ever scheduled automatically;
placement into a slot is always a deliberate action in the UI.

## 10. Auth

JWT in an HttpOnly cookie, seven-day expiry, following the existing
`src/lib/auth.ts` pattern from `wealth-daily-landing`. `bcryptjs` for the
password hash. Middleware protects every route except `/login`. Account
created by `npm run seed:admin` from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## 11. Stack and environment

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Mongoose ·
`postgres` (read-only, raw tagged-template SQL — no Drizzle schema copy to
drift) · `@anthropic-ai/sdk` + `zod` · Vitest.

Two databases, one direction of travel: **Mongo is written, Postgres is only
read.**

```
MONGODB_URI                 the app's own store
JWT_SECRET
SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD
ANTHROPIC_API_KEY
WEALTH_DAILY_DATABASE_URL   read-only role, dev database (optional)
NEXT_PUBLIC_APP_URL
```

## 12. Testing

Vitest. The Anthropic call is mocked everywhere; no test hits the API or a
live database.

- **Prompt assembly** — the correct bucket, series, examples, do-not list and
  last-eight openers are present; the forbidden phrases appear as prohibitions.
- **CTA rotation** — never repeats consecutively.
- **Mix calculation** — last-30-day bucket percentages against target.
- **Slot resolution** — date → weekly slot, including weeks with skipped posts.
- **Capture classification** — a classified response maps to a valid bucket and
  series, and writes a `Post` with `status: captured` and no `slotKey`.
- **Source adapter** — query shape against a schema fixture; graceful `null`
  return when the connection is absent.
- **Auth** — token sign/verify, middleware redirect.

## 13. Success criteria

1. Opening `/` on any day states what to post without requiring a decision.
2. A Monday draft names a real card from a real deck, not a generic prompt.
3. `/live-it <story>` produces a bucket-classified draft visible on the site
   within seconds, with the web server stopped.
4. No generated caption contains a feature announcement or a platform-
   instruction CTA.
5. Removing `WEALTH_DAILY_DATABASE_URL` degrades the app without breaking a
   single screen.
