# The LIVE IT Engine

A private tool that answers one question every morning: **what am I posting today, and what do I say?**

It is not for promoting Wealth Daily. It is for documenting LIVE IT — Wealth Daily is the thing people notice underneath.

## What it does

- **Assigns the week.** Mon LIVE IT · Tue THE IDEA · Thu PROOF · Sat BUILDING. Decided once, not weekly.
- **Drafts the caption** in Trisha's voice, from ten seconds of rough notes.
- **Grounds it in real content** — the actual text of actual cards from the Wealth Daily catalogue, read over a read-only connection.
- **Captures off-schedule stories** from the command line, sorted into a bucket and drafted without opening the site.
- **Watches the mix** against the 40 / 25 / 20 / 15 target.

## The four buckets

| Bucket | Share | What it is |
| --- | --- | --- |
| I'M LIVING IT | 40% | Trisha doing the thing. Documentation, not teaching. |
| PEOPLE ARE LIVING IT | 25% | Someone else's evidence. |
| THE IDEA | 20% | Beliefs, stated flat. Never advertisements. |
| BEHIND THE WORLD | 15% | What she's building. Never corporate. |

## Running it

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run seed                   # the strategy brain: buckets, series, voice rules
npm run seed:admin             # the single account
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | The site |
| `npm run live-it -- "what happened"` | Capture a story from the terminal |
| `npm test` | 97 tests; never hits the API or a database |
| `npm run check:source` | Probes every Wealth Daily query for schema drift |

## Environment

```
MONGODB_URI                 this app's own store
JWT_SECRET
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
ANTHROPIC_API_KEY
WEALTH_DAILY_DATABASE_URL   read-only role, dev database — optional
NEXT_PUBLIC_APP_URL
```

Two databases, one direction of travel: **Mongo is written, Postgres is only read.** Every screen still works with `WEALTH_DAILY_DATABASE_URL` unset — the card picker falls back to free text.

## The part that matters

The agent's craft rules live in seeded data, editable at `/strategy`, not buried in code. Prohibition number one is that it may never write a detail Trisha did not say — no invented card, place, feeling, weather or habit. The movement runs on the evidence being real.

## Documentation

- `docs/superpowers/specs/` — the design
- `docs/superpowers/plans/` — the implementation plan

## Licence

MIT © Trisha Leconte
