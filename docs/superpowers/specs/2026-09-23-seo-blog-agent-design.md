# The SEO blog agent — design

Date: 2026-09-23
Status: awaiting review
Owner: Trisha (sole user)
Sub-project: **B** of three (B → A → C, see §2)

---

## 1. The problem

Trisha wants keyword-targeted blog posts. The LIVE IT social agent already
exists and writes captions well, but its craft rules are actively wrong for
search:

| The social agent is told | Search needs the opposite |
| --- | --- |
| "Never explain the moral" | Answer the query explicitly, in the first paragraph |
| "End on an open loop" | Resolve it, or the reader bounces back to Google |
| "Short lines, real white space" | H2/H3 structure, 1,200–2,000 words |
| "The ask is an invitation" | Internal links and a conversion path |

Pointing one agent at both jobs makes it mediocre at each. This is a **second
agent sharing the architecture** — same belief profile for voice, same
Wealth Daily source, same prompt-assembly and testing patterns, different
craft rules.

## 2. Where this sits

Three independent subsystems, built in this order:

| | Subsystem | Status |
| --- | --- | --- |
| **B** | This: the SEO writing agent, in the LIVE IT Engine | **This spec** |
| **A** | A real blog on wealthdailyapp.com (schema, routes, sitemap) | Not started |
| **C** | Google Search Console keyword intelligence | Deferred — the site is new and has no impressions worth reading |

B first because it lives in the repo we already have, reuses what is built,
and produces publishable drafts immediately. A is deliberately last: an empty
blog ranks for nothing, and by the time it exists there will be a queue of
posts to fill it.

**Consequence of C being deferred:** there is no search volume or difficulty
data. The UI must say so plainly rather than imply precision it does not have.

## 3. What targets keywords instead

Trisha's catalogue is the advantage. She has *The Science of Getting Rich*
(84 cards plus a 187-card experiment deck), *The Science of Being Great*,
*The Man in the Mirror*, *The Attitude Advantage*, and a 101-card deck on
loving your person — 543 cards across 9 titles.

People already search "Science of Getting Rich summary" and "Science of
Getting Rich exercises". That is known demand needing no tool. And she has
what nobody else ranking for those terms has: **the actual exercises**.

So the idea source is her own catalogue, read through the existing read-only
adapter, rather than an invented keyword list.

## 4. Blog craft rules

Seeded as a `BlogProfile`, editable at `/strategy`, rendered into every
prompt. It **inherits the belief profile** (§6) — the one story, why the
brand exists, her beliefs, the enemy, her reader, both vocabulary lists —
and replaces only the structure rules.

### Structure

1. Answer the query in the first 100 words. No throat-clearing, no "in this
   article we will explore".
2. H2s are phrased as the questions people actually type, not as labels.
3. 1,200–2,000 words, unless the topic is genuinely shorter. Never pad to
   hit a number.
4. One idea per section. A reader skimming the H2s alone should get the
   answer.
5. Close by resolving, then one CTA tied to a real deck or book.

### Content

6. Every abstract claim is followed by a concrete instance — ideally one of
   her real cards or exercises. That specificity is the thing Google cannot
   find elsewhere.
7. Write from her point of view. A blog post with no opinion is indexed and
   ignored.
8. Internal links to real products, by real slug, where they genuinely help.

### Absolute prohibitions

9. **No fabricated statistics, studies, percentages, or named researchers.**
   This is prohibition number one, for the same reason it is in the social
   agent: her movement rests on evidence being real, and an invented "73% of
   readers" would do more damage than any missed ranking. If a claim needs a
   number she has not supplied, make the claim qualitatively or drop it.
10. **No invented detail about Trisha's life** — same rule as the social
    agent, same reason.
11. No coach-copy. The `wordsSheNeverUses` list applies here exactly as it
    does to captions: *unlock your potential, elevate your life, step into
    your highest self, transformative journey, quantum leap, embark on a
    journey, actionable insights.*
12. No AI-tells: "In today's fast-paced world", "Let's dive in", "It's
    important to note", "In conclusion".
13. No keyword stuffing. The target keyword appears in the title, the first
    paragraph, one H2 and the meta description — and then only where it
    reads naturally.
14. No listicle padding — no "10 ways" where there are four real ones.

## 5. Two stages, not one

**Stage 1 — outline.** Input: a topic or keyword, plus an optional source
product. Output: target keyword, secondary keywords, search intent
(informational / commercial / navigational), three title options, meta
description, an H2/H3 outline, which real cards or products to cite,
suggested internal links, and an estimated word count.

**Stage 2 — draft.** Input: the approved outline, edited by Trisha. Output:
the full article as Markdown.

Two stages because the outline is where SEO is actually decided, it is cheap
to regenerate, and generating 2,000 words from a bad outline wastes the lot.
Trisha can edit any field of the outline before Stage 2 runs.

## 6. What is reused, unchanged

| From the LIVE IT Engine | Used for |
| --- | --- |
| `StrategyProfile` + belief profile | Voice, beliefs, enemy, reader, vocabulary |
| `src/lib/wealthdaily/source.ts` | Real cards, decks, products, slugs |
| `src/lib/agent/generate.ts` pattern | `messages.parse` + `zodOutputFormat`, `claude-opus-5`, adaptive thinking, cached system prefix |
| `src/lib/auth.ts`, `src/lib/session.ts` | Same single account, same guards |
| `src/lib/db.ts`, models pattern | Same Mongo connection and typed models |
| Vitest patterns | Pure prompt tests, mocked agent, no live calls |

New code is confined to: `BlogPost` and `BlogProfile` models, `src/lib/blog/`
(prompt assembly, generation, idea mining), and `/blog` screens.

## 7. Data model

### `BlogProfile` (singleton)

`structureRules[]`, `contentRules[]`, `doNotList[]`, `targetWordCount`,
`siteUrl`. Seeded from §4. The belief profile is **not** duplicated here —
it is read from `StrategyProfile`, so editing voice in one place changes
both agents.

### `BlogPost`

`topic`, `targetKeyword`, `secondaryKeywords[]`, `searchIntent`,
`titleOptions[]`, `chosenTitle`, `slug`, `metaDescription`, `outline[]`
(each `{ heading, level, notes }`), `bodyMarkdown`, `internalLinks[]`
(each `{ label, url }`), `sourceRefs[]` (real cards or products cited),
`audience` (`reader` | `creator` | `book_searcher`), `wordCount`,
`status` (`idea` | `outlined` | `drafted` | `ready` | `published`),
`generations[]`, timestamps.

## 8. Screens

| Route | Purpose |
| --- | --- |
| `/blog` | Every post by status. New post from a topic. |
| `/blog/[id]` | The two-stage composer: outline → edit → draft → edit → copy out. |
| `/blog/ideas` | Catalogue-mined suggestions: "You have 84 cards on Science of Getting Rich — here are 8 articles only you can write." |

`/strategy` gains a Blog section for the blog rules, alongside the existing
voice rules.

## 9. Out of scope for v1

| Left out | Why |
| --- | --- |
| Publishing anywhere | That is sub-project A. Output is Markdown you copy out. |
| Search volume / difficulty | No data source until C. The UI says so. |
| Images or diagrams | Different tool. |
| Competitor analysis | Needs a paid API; belongs with C. |
| Automatic internal-link insertion | The agent suggests links; Trisha places them. |
| Scheduling or a content calendar | The social calendar already exists and blogs do not need one yet. |

## 10. Testing

Vitest. The Anthropic call is mocked everywhere; no test touches the API,
MongoDB, or Postgres.

- **Blog prompt assembly** — the belief profile is present; blog structure
  rules replace social ones; the social rules ("end on an open loop", "never
  explain the moral") are absent; the fabricated-statistics ban is
  prohibition number one; `wordsSheNeverUses` appears.
- **Outline schema** — three titles, a meta description within 150–160
  characters, at least three H2s.
- **Draft schema** — body is non-empty Markdown; every H2 in the approved
  outline appears in the body.
- **Slug generation** — lowercased, hyphenated, ASCII, no stop-word soup,
  stable for the same title.
- **Idea mining** — given a fake catalogue, proposes one idea per product
  and never proposes a product with zero cards.
- **Degradation** — with `WEALTH_DAILY_DATABASE_URL` unset, `/blog/ideas`
  renders an explanation and the composer still works from a typed topic.

## 11. Success criteria

1. A topic typed into `/blog` returns an outline naming a real card or
   product from the catalogue.
2. An approved outline produces a draft whose H2s match it.
3. No generated draft contains a statistic, a study, or a named researcher.
4. No generated draft contains a phrase from `wordsSheNeverUses`.
5. `/blog/ideas` proposes at least five articles derived from real products.
6. Removing `WEALTH_DAILY_DATABASE_URL` degrades the blog screens without
   breaking any of them.

## 12. Known limitation, stated plainly

Without Search Console or a keyword API, keyword targeting is the model's
judgement, not measured demand. What this system genuinely provides is:
structure that matches search intent, grounding in content nobody else has,
and Trisha's actual point of view. What it does not provide is evidence that
anyone searches a given phrase.

The UI must say this on `/blog/ideas` in one line, rather than presenting
invented confidence. Sub-project C removes the limitation once the site has
impressions worth reading.
