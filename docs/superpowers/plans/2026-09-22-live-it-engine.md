# The LIVE IT Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private Next.js + MongoDB site and CLI that tells Trisha what to post each day and drafts the caption in her voice, grounded in real Wealth Daily deck content.

**Architecture:** One Next.js 15 App Router application. MongoDB (Mongoose) holds everything the app owns — the strategy brain, posts, drafts. A separate, strictly read-only Postgres connection reads content out of the Wealth Daily v2 *development* database through a single adapter module. The Anthropic SDK generates captions from a prompt assembled out of seeded strategy data plus that real content. A CLI script writes to the same MongoDB so stories captured from the terminal appear on the site immediately.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript 5.9 · Tailwind 3.4 · Mongoose 8 · `postgres` 3 (read-only, raw SQL) · `@anthropic-ai/sdk` · `zod` · `bcryptjs` · `jsonwebtoken` · Vitest 3

**Spec:** `docs/superpowers/specs/2026-09-22-content-strategy-agent-design.md`

## Global Constraints

- Project root is `/Users/heroverse/Documents/Projects/WealthDaily/content-strategy`. Already a git repo.
- Path alias `@/*` → `./src/*`.
- **The Postgres connection is read-only and must never gain a write path.** No `INSERT`/`UPDATE`/`DELETE`/`CREATE` anywhere under `src/lib/wealthdaily/`.
- **The app must fully function with `WEALTH_DAILY_DATABASE_URL` unset.** Every adapter function returns `null` or `[]` in that case; no screen may throw.
- Agent model is exactly `claude-opus-5`. Never append a date suffix. Use `thinking: { type: "adaptive" }`. Never pass `budget_tokens` (400 on this model).
- Structured output uses `client.messages.parse()` with `zodOutputFormat`. Never a hand-rolled tool definition, never the deprecated `output_format` parameter.
- No test may hit the Anthropic API, MongoDB, or Postgres. Mock at the module boundary.
- Bucket keys are exactly: `LIVING_IT`, `PEOPLE_LIVING_IT`, `THE_IDEA`, `BEHIND_THE_WORLD`. Targets 40/25/20/15.
- Series keys are exactly: `TODAY_I_LIVED_IT`, `SOMEONE_LIVED_IT`, `TRY_THIS`, `FROM_PAGE_TO_PRACTICE`, `BUILDING_WEALTH_DAILY`, `IMAGINE_YOUR_IP_LIKE_THIS`.
- Post statuses are exactly: `idea`, `captured`, `drafted`, `ready`, `posted`, `skipped`.
- Platform keys are exactly: `instagram`, `linkedin`, `facebook_threads`.
- Commit after every task. Conventional commit prefixes (`feat:`, `test:`, `chore:`).

---

## File Structure

```
scripts/
  seed.ts                  strategy brain → MongoDB
  seed-admin.ts            the single user account
  capture.ts               CLI story capture
  check-source.ts          Postgres schema-drift probe
src/
  app/
    layout.tsx  globals.css  page.tsx            Today
    login/page.tsx
    post/[id]/page.tsx                           Composer
    captured/page.tsx  proof/page.tsx
    coverage/page.tsx  library/page.tsx
    calendar/page.tsx  strategy/page.tsx
    api/
      auth/login|logout|me/route.ts
      posts/route.ts  posts/[id]/route.ts
      agent/draft/route.ts
      strategy/route.ts
  components/            presentational only
  lib/
    db.ts                Mongoose connection cache
    auth.ts              JWT + bcrypt
    schedule.ts          date → weekly slot          (pure)
    mix.ts               bucket mix vs target         (pure)
    rotation.ts          CTA + opener rotation        (pure)
    posts.ts             post service functions
    agent/
      schema.ts          zod contract                 (pure)
      prompt.ts          prompt assembly              (pure)
      generate.ts        Anthropic call
    wealthdaily/
      client.ts          nullable read-only pg client
      map.ts             row → domain mapping         (pure)
      source.ts          the seven query functions
  models/                Mongoose schemas
  seed/strategy.ts       the seeded strategy brain    (data)
  types/index.ts
tests/                   mirrors src/
```

---

### Task 1: Project scaffold, database connection, test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `src/lib/db.ts`, `src/app/layout.tsx`, `src/app/globals.css`
- Test: `tests/lib/db.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `dbConnect(): Promise<typeof mongoose>` from `@/lib/db`

- [ ] **Step 1: Create the project files**

`package.json`:

```json
{
  "name": "live-it-engine",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed": "tsx scripts/seed.ts",
    "seed:admin": "tsx scripts/seed-admin.ts",
    "live-it": "tsx scripts/capture.ts",
    "check:source": "tsx scripts/check-source.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.68.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.0",
    "next": "^15.1.0",
    "postgres": "^3.4.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "dotenv": "^16.4.7",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.1.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "5.9.3",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`next.config.ts`:

```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = { serverExternalPackages: ["mongoose", "postgres"] };
export default nextConfig;
```

`tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        living: "#1E6F4C",
        people: "#A0650F",
        idea: "#2B4A7D",
        build: "#6B3A67",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

`postcss.config.mjs`:

```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`.gitignore`:

```
node_modules
.next
.env.local
.env
*.tsbuildinfo
next-env.d.ts
```

`.env.example`:

```
MONGODB_URI=mongodb://localhost:27017/live-it-engine
JWT_SECRET=change-me
SEED_ADMIN_EMAIL=trisha@herobrandguide.com
SEED_ADMIN_PASSWORD=change-me
ANTHROPIC_API_KEY=
WEALTH_DAILY_DATABASE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "LIVE IT Engine" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: completes without peer-dependency errors.

- [ ] **Step 3: Write the failing test**

`tests/lib/db.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const connect = vi.fn().mockResolvedValue({ connection: { readyState: 1 } });
vi.mock("mongoose", () => ({ default: { connect, connections: [] } }));

describe("dbConnect", () => {
  beforeEach(() => {
    vi.resetModules();
    connect.mockClear();
    delete process.env.MONGODB_URI;
  });

  it("throws a clear error when MONGODB_URI is not set", async () => {
    const { dbConnect } = await import("@/lib/db");
    await expect(dbConnect()).rejects.toThrow("MONGODB_URI is not set");
  });

  it("connects once and reuses the connection on later calls", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    const { dbConnect } = await import("@/lib/db");
    await dbConnect();
    await dbConnect();
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- tests/lib/db.test.ts`
Expected: FAIL — cannot resolve `@/lib/db`.

- [ ] **Step 5: Write the implementation**

`src/lib/db.ts`:

```typescript
import mongoose from "mongoose";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalCache = globalThis as unknown as { _mongoose?: Cache };
const cached: Cache = globalCache._mongoose ?? { conn: null, promise: null };
globalCache._mongoose = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- tests/lib/db.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with MongoDB connection and Vitest"
```

---

### Task 2: Domain models

**Files:**
- Create: `src/types/index.ts`, `src/models/User.ts`, `src/models/StrategyProfile.ts`, `src/models/Bucket.ts`, `src/models/Series.ts`, `src/models/WeeklySlot.ts`, `src/models/Post.ts`, `src/models/StoryPrompt.ts`
- Test: `tests/models/post.test.ts`

**Interfaces:**
- Consumes: `dbConnect` from `@/lib/db`
- Produces: `BucketKey`, `SeriesKey`, `PostStatus`, `PlatformKey`, `Lens`, `CardCandidate` types from `@/types`; Mongoose models `User`, `StrategyProfile`, `Bucket`, `Series`, `WeeklySlot`, `Post`, `StoryPrompt` as default exports of their files.

- [ ] **Step 1: Write the types**

`src/types/index.ts`:

```typescript
export const BUCKET_KEYS = ["LIVING_IT", "PEOPLE_LIVING_IT", "THE_IDEA", "BEHIND_THE_WORLD"] as const;
export type BucketKey = (typeof BUCKET_KEYS)[number];

export const SERIES_KEYS = [
  "TODAY_I_LIVED_IT",
  "SOMEONE_LIVED_IT",
  "TRY_THIS",
  "FROM_PAGE_TO_PRACTICE",
  "BUILDING_WEALTH_DAILY",
  "IMAGINE_YOUR_IP_LIKE_THIS",
] as const;
export type SeriesKey = (typeof SERIES_KEYS)[number];

export const POST_STATUSES = ["idea", "captured", "drafted", "ready", "posted", "skipped"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const PLATFORM_KEYS = ["instagram", "linkedin", "facebook_threads"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export type Lens = "consumer" | "creator";

/** A real card read out of the Wealth Daily database. */
export type CardCandidate = {
  activityId: string;
  productId: string;
  text: string;
  productTitle: string;
  chapterTitle: string | null;
};
```

- [ ] **Step 2: Write the failing test**

`tests/models/post.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import Post from "@/models/Post";

describe("Post model", () => {
  it("rejects a status outside the allowed set", () => {
    const doc = new Post({ bucketKey: "LIVING_IT", status: "publishd" });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it("rejects an unknown bucket key", () => {
    const doc = new Post({ bucketKey: "NONSENSE", status: "idea" });
    const err = doc.validateSync();
    expect(err?.errors.bucketKey).toBeDefined();
  });

  it("defaults a new post to status idea with an empty generations list", () => {
    const doc = new Post({ bucketKey: "THE_IDEA" });
    expect(doc.status).toBe("idea");
    expect(doc.generations).toEqual([]);
  });

  it("accepts a captured post that has no slotKey", () => {
    const doc = new Post({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", status: "captured", rawNotes: "penny" });
    expect(doc.validateSync()).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- tests/models/post.test.ts`
Expected: FAIL — cannot resolve `@/models/Post`.

- [ ] **Step 4: Write the models**

`src/models/Post.ts`:

```typescript
import mongoose, { Schema } from "mongoose";
import { BUCKET_KEYS, SERIES_KEYS, POST_STATUSES, PLATFORM_KEYS } from "@/types";

const GenerationSchema = new Schema(
  {
    createdAt: { type: Date, default: Date.now },
    captions: [String],
    hooks: [String],
    cta: String,
    platformVariants: { type: Map, of: String },
    suggestedVisual: String,
    storyVersion: String,
  },
  { _id: false }
);

const PostSchema = new Schema(
  {
    date: Date,
    slotKey: String,
    bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
    seriesKey: { type: String, enum: SERIES_KEYS },
    lens: { type: String, enum: ["consumer", "creator"], default: "consumer" },
    rawNotes: { type: String, default: "" },
    sourceCardRef: {
      type: new Schema(
        { activityId: String, productId: String, text: String, productTitle: String, chapterTitle: String },
        { _id: false }
      ),
      default: undefined,
    },
    generations: { type: [GenerationSchema], default: [] },
    chosenCaption: String,
    platformVariants: { type: Map, of: String, default: undefined },
    suggestedVisual: String,
    storyVersion: String,
    cta: String,
    status: { type: String, enum: POST_STATUSES, default: "idea" },
    postedAt: Date,
    platforms: [{ type: String, enum: PLATFORM_KEYS }],
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model("Post", PostSchema);
```

`src/models/Bucket.ts`:

```typescript
import mongoose, { Schema } from "mongoose";
import { BUCKET_KEYS } from "@/types";

const BucketSchema = new Schema({
  key: { type: String, enum: BUCKET_KEYS, required: true, unique: true },
  name: { type: String, required: true },
  targetPercent: { type: Number, required: true },
  description: String,
  whatItIsNot: String,
  color: String,
});

export default mongoose.models.Bucket || mongoose.model("Bucket", BucketSchema);
```

`src/models/Series.ts`:

```typescript
import mongoose, { Schema } from "mongoose";
import { BUCKET_KEYS, SERIES_KEYS } from "@/types";

const SeriesSchema = new Schema({
  key: { type: String, enum: SERIES_KEYS, required: true, unique: true },
  name: { type: String, required: true },
  bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
  promptQuestions: [String],
  structureSkeleton: String,
  examples: [String],
});

export default mongoose.models.Series || mongoose.model("Series", SeriesSchema);
```

`src/models/WeeklySlot.ts`:

```typescript
import mongoose, { Schema } from "mongoose";
import { BUCKET_KEYS, SERIES_KEYS } from "@/types";

const WeeklySlotSchema = new Schema({
  key: { type: String, required: true, unique: true },
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  label: String,
  bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
  defaultSeriesKey: { type: String, enum: SERIES_KEYS, required: true },
});

export default mongoose.models.WeeklySlot || mongoose.model("WeeklySlot", WeeklySlotSchema);
```

`src/models/StrategyProfile.ts`:

```typescript
import mongoose, { Schema } from "mongoose";

const StrategyProfileSchema = new Schema(
  {
    singleton: { type: String, default: "the-one", unique: true },
    oneStory: { type: String, required: true },
    audiences: [{ who: String, thought: String }],
    voiceRules: [String],
    doNotList: [String],
    ctaRotation: [String],
    openerBank: [String],
    profileBio: String,
    pinnedPosts: [{ title: String, brief: String }],
  },
  { timestamps: true }
);

export default mongoose.models.StrategyProfile ||
  mongoose.model("StrategyProfile", StrategyProfileSchema);
```

`src/models/StoryPrompt.ts`:

```typescript
import mongoose, { Schema } from "mongoose";

const StoryPromptSchema = new Schema({ text: { type: String, required: true } });

export default mongoose.models.StoryPrompt || mongoose.model("StoryPrompt", StoryPromptSchema);
```

`src/models/User.ts`:

```typescript
import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: String,
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- tests/models/post.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Mongoose models for the strategy brain and posts"
```

---

### Task 3: Scheduling, mix and rotation logic

These are pure functions with no I/O. They carry the rules that stop the app repeating itself.

**Files:**
- Create: `src/lib/schedule.ts`, `src/lib/mix.ts`, `src/lib/rotation.ts`
- Test: `tests/lib/schedule.test.ts`, `tests/lib/mix.test.ts`, `tests/lib/rotation.test.ts`

**Interfaces:**
- Consumes: `BucketKey` from `@/types`
- Produces:
  - `slotForDate(date: Date, slots: SlotLike[]): SlotLike | null`
  - `weekSlots(date: Date, slots: SlotLike[]): { date: Date; slot: SlotLike }[]`
  - `computeMix(posts: {bucketKey: BucketKey}[], targets: Record<BucketKey, number>): MixRow[]`
  - `nextCta(rotation: string[], recent: string[]): string`
  - `firstWords(caption: string, n?: number): string`
  - `recentOpeners(captions: string[], n?: number): string[]`

- [ ] **Step 1: Write the failing tests**

`tests/lib/schedule.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { slotForDate, weekSlots } from "@/lib/schedule";

const SLOTS = [
  { key: "mon", dayOfWeek: 1, bucketKey: "LIVING_IT" as const, defaultSeriesKey: "TODAY_I_LIVED_IT" as const },
  { key: "tue", dayOfWeek: 2, bucketKey: "THE_IDEA" as const, defaultSeriesKey: "TRY_THIS" as const },
  { key: "thu", dayOfWeek: 4, bucketKey: "PEOPLE_LIVING_IT" as const, defaultSeriesKey: "SOMEONE_LIVED_IT" as const },
  { key: "sat", dayOfWeek: 6, bucketKey: "BEHIND_THE_WORLD" as const, defaultSeriesKey: "BUILDING_WEALTH_DAILY" as const },
];

describe("slotForDate", () => {
  it("returns the Monday slot for a Monday", () => {
    // 2026-09-21 is a Monday
    expect(slotForDate(new Date("2026-09-21T12:00:00"), SLOTS)?.key).toBe("mon");
  });

  it("returns null on a day with no slot", () => {
    // 2026-09-23 is a Wednesday
    expect(slotForDate(new Date("2026-09-23T12:00:00"), SLOTS)).toBeNull();
  });
});

describe("weekSlots", () => {
  it("returns the four slots of the containing Monday-to-Sunday week, in order", () => {
    const week = weekSlots(new Date("2026-09-23T12:00:00"), SLOTS);
    expect(week.map((w) => w.slot.key)).toEqual(["mon", "tue", "thu", "sat"]);
  });

  it("dates each slot to the correct day of that week", () => {
    const week = weekSlots(new Date("2026-09-23T12:00:00"), SLOTS);
    expect(week[0].date.getDate()).toBe(21);
    expect(week[3].date.getDate()).toBe(26);
  });

  it("uses the same week when given the Sunday that ends it", () => {
    const week = weekSlots(new Date("2026-09-27T12:00:00"), SLOTS);
    expect(week[0].date.getDate()).toBe(21);
  });
});
```

`tests/lib/mix.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeMix } from "@/lib/mix";

const TARGETS = { LIVING_IT: 40, PEOPLE_LIVING_IT: 25, THE_IDEA: 20, BEHIND_THE_WORLD: 15 } as const;

describe("computeMix", () => {
  it("returns every bucket at zero when there are no posts", () => {
    const rows = computeMix([], TARGETS);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.actualPercent === 0 && r.count === 0)).toBe(true);
  });

  it("computes the percentage of posts in each bucket", () => {
    const posts = [
      { bucketKey: "LIVING_IT" as const },
      { bucketKey: "LIVING_IT" as const },
      { bucketKey: "THE_IDEA" as const },
      { bucketKey: "BEHIND_THE_WORLD" as const },
    ];
    const rows = computeMix(posts, TARGETS);
    expect(rows.find((r) => r.bucketKey === "LIVING_IT")?.actualPercent).toBe(50);
    expect(rows.find((r) => r.bucketKey === "THE_IDEA")?.actualPercent).toBe(25);
    expect(rows.find((r) => r.bucketKey === "PEOPLE_LIVING_IT")?.actualPercent).toBe(0);
  });

  it("reports the signed gap against target", () => {
    const rows = computeMix([{ bucketKey: "LIVING_IT" as const }], TARGETS);
    expect(rows.find((r) => r.bucketKey === "LIVING_IT")?.gap).toBe(60);
    expect(rows.find((r) => r.bucketKey === "THE_IDEA")?.gap).toBe(-20);
  });

  it("orders rows by descending target so the bar always reads the same way", () => {
    expect(computeMix([], TARGETS).map((r) => r.bucketKey)).toEqual([
      "LIVING_IT",
      "PEOPLE_LIVING_IT",
      "THE_IDEA",
      "BEHIND_THE_WORLD",
    ]);
  });
});
```

`tests/lib/rotation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { nextCta, firstWords, recentOpeners } from "@/lib/rotation";

const ROTATION = ["Try this today.", "Show me your proof.", "Come LIVE IT with us."];

describe("nextCta", () => {
  it("returns the first CTA when nothing has been used", () => {
    expect(nextCta(ROTATION, [])).toBe("Try this today.");
  });

  it("never repeats the most recently used CTA", () => {
    expect(nextCta(ROTATION, ["Try this today."])).not.toBe("Try this today.");
  });

  it("prefers the least recently used CTA", () => {
    expect(nextCta(ROTATION, ["Come LIVE IT with us.", "Show me your proof."])).toBe("Try this today.");
  });

  it("still returns something when every CTA was used recently", () => {
    expect(ROTATION).toContain(nextCta(ROTATION, [...ROTATION].reverse()));
  });

  it("throws when the rotation is empty, rather than returning undefined", () => {
    expect(() => nextCta([], [])).toThrow("CTA rotation is empty");
  });
});

describe("firstWords", () => {
  it("takes the first six words of a caption by default", () => {
    expect(firstWords("Today's card told me to compliment a stranger and I did")).toBe(
      "Today's card told me to compliment"
    );
  });

  it("ignores leading whitespace and blank lines", () => {
    expect(firstWords("\n\n  Did it anyway.", 3)).toBe("Did it anyway.");
  });

  it("returns an empty string for an empty caption", () => {
    expect(firstWords("")).toBe("");
  });
});

describe("recentOpeners", () => {
  it("returns the openers of the last eight captions, newest first", () => {
    const captions = Array.from({ length: 10 }, (_, i) => `Caption number ${i} continues here`);
    const openers = recentOpeners(captions);
    expect(openers).toHaveLength(8);
    expect(openers[0]).toContain("number 9");
  });

  it("drops blank captions", () => {
    expect(recentOpeners(["", "Did it anyway now"])).toEqual(["Did it anyway now"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/schedule.test.ts tests/lib/mix.test.ts tests/lib/rotation.test.ts`
Expected: FAIL — none of the three modules resolve.

- [ ] **Step 3: Write the implementations**

`src/lib/schedule.ts`:

```typescript
import type { BucketKey, SeriesKey } from "@/types";

export type SlotLike = {
  key: string;
  dayOfWeek: number;
  bucketKey: BucketKey;
  defaultSeriesKey: SeriesKey;
};

/** Midnight on the Monday of the week containing `date` (weeks run Mon–Sun). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7; // Sunday (0) is 6 days after Monday
  d.setDate(d.getDate() - shift);
  return d;
}

export function slotForDate(date: Date, slots: SlotLike[]): SlotLike | null {
  return slots.find((s) => s.dayOfWeek === date.getDay()) ?? null;
}

export function weekSlots(date: Date, slots: SlotLike[]): { date: Date; slot: SlotLike }[] {
  const monday = startOfWeek(date);
  return slots
    .map((slot) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + ((slot.dayOfWeek + 6) % 7));
      return { date: d, slot };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
```

`src/lib/mix.ts`:

```typescript
import { BUCKET_KEYS, type BucketKey } from "@/types";

export type MixRow = {
  bucketKey: BucketKey;
  count: number;
  actualPercent: number;
  targetPercent: number;
  gap: number;
};

export function computeMix(
  posts: { bucketKey: BucketKey }[],
  targets: Record<BucketKey, number>
): MixRow[] {
  const total = posts.length;
  return BUCKET_KEYS.map((bucketKey) => {
    const count = posts.filter((p) => p.bucketKey === bucketKey).length;
    const actualPercent = total === 0 ? 0 : Math.round((count / total) * 100);
    const targetPercent = targets[bucketKey];
    return { bucketKey, count, actualPercent, targetPercent, gap: actualPercent - targetPercent };
  }).sort((a, b) => b.targetPercent - a.targetPercent);
}
```

`src/lib/rotation.ts`:

```typescript
/**
 * Pick the least recently used CTA. `recent` is newest-first; a CTA absent
 * from it has never been used and wins outright.
 */
export function nextCta(rotation: string[], recent: string[]): string {
  if (rotation.length === 0) throw new Error("CTA rotation is empty");
  const scored = rotation.map((cta) => {
    const idx = recent.indexOf(cta);
    return { cta, staleness: idx === -1 ? Number.POSITIVE_INFINITY : idx };
  });
  scored.sort((a, b) => b.staleness - a.staleness);
  return scored[0].cta;
}

export function firstWords(caption: string, n = 6): string {
  return caption.trim().split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

/** Openers of the most recent captions, newest first, blanks removed. */
export function recentOpeners(captions: string[], n = 8): string[] {
  return captions
    .filter((c) => c.trim().length > 0)
    .slice(-n)
    .reverse()
    .map((c) => firstWords(c));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/lib/schedule.test.ts tests/lib/mix.test.ts tests/lib/rotation.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add scheduling, mix and rotation logic"
```

---

### Task 4: The seeded strategy brain

This is the task that makes the app useful on first run. Content comes verbatim from the spec, §3 and §5.

**Files:**
- Create: `src/seed/strategy.ts`, `scripts/seed.ts`
- Test: `tests/seed/strategy.test.ts`

**Interfaces:**
- Consumes: `BucketKey`, `SeriesKey` from `@/types`
- Produces: `BUCKETS`, `SERIES`, `WEEKLY_SLOTS`, `STRATEGY_PROFILE`, `STORY_PROMPTS` from `@/seed/strategy`

- [ ] **Step 1: Write the failing test**

`tests/seed/strategy.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { BUCKETS, SERIES, WEEKLY_SLOTS, STRATEGY_PROFILE, STORY_PROMPTS } from "@/seed/strategy";
import { BUCKET_KEYS, SERIES_KEYS } from "@/types";

describe("seeded strategy", () => {
  it("defines all four buckets, and their targets sum to 100", () => {
    expect(BUCKETS.map((b) => b.key).sort()).toEqual([...BUCKET_KEYS].sort());
    expect(BUCKETS.reduce((n, b) => n + b.targetPercent, 0)).toBe(100);
  });

  it("gives every bucket a whatItIsNot, since the agent relies on it", () => {
    expect(BUCKETS.every((b) => b.whatItIsNot.trim().length > 0)).toBe(true);
  });

  it("defines all six series, each pointing at a real bucket", () => {
    expect(SERIES.map((s) => s.key).sort()).toEqual([...SERIES_KEYS].sort());
    expect(SERIES.every((s) => BUCKET_KEYS.includes(s.bucketKey))).toBe(true);
  });

  it("gives every series prompt questions and at least one real example", () => {
    expect(SERIES.every((s) => s.promptQuestions.length > 0 && s.examples.length > 0)).toBe(true);
  });

  it("schedules exactly four posts a week on Mon, Tue, Thu and Sat", () => {
    expect(WEEKLY_SLOTS.map((s) => s.dayOfWeek)).toEqual([1, 2, 4, 6]);
  });

  it("points every slot at a series that belongs to that slot's bucket", () => {
    for (const slot of WEEKLY_SLOTS) {
      const series = SERIES.find((s) => s.key === slot.defaultSeriesKey);
      expect(series?.bucketKey).toBe(slot.bucketKey);
    }
  });

  it("names the feature-advertising failure mode in the do-not list", () => {
    const joined = STRATEGY_PROFILE.doNotList.join(" ").toLowerCase();
    expect(joined).toContain("download");
    expect(joined).toContain("streaks");
  });

  it("forbids platform-instruction CTAs in the do-not list", () => {
    const joined = STRATEGY_PROFILE.doNotList.join(" ").toLowerCase();
    expect(joined).toContain("comment below");
    expect(joined).toContain("tag a friend");
  });

  it("carries a CTA rotation and an opener bank the agent can rotate through", () => {
    expect(STRATEGY_PROFILE.ctaRotation.length).toBeGreaterThanOrEqual(5);
    expect(STRATEGY_PROFILE.openerBank.length).toBeGreaterThanOrEqual(5);
  });

  it("defines exactly three pinned posts", () => {
    expect(STRATEGY_PROFILE.pinnedPosts).toHaveLength(3);
  });

  it("carries story prompts for the unscheduled Stories layer", () => {
    expect(STORY_PROMPTS.length).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/seed/strategy.test.ts`
Expected: FAIL — cannot resolve `@/seed/strategy`.

- [ ] **Step 3: Write the seed data**

`src/seed/strategy.ts`:

```typescript
import type { BucketKey, SeriesKey } from "@/types";

export const BUCKETS: {
  key: BucketKey;
  name: string;
  targetPercent: number;
  description: string;
  whatItIsNot: string;
  color: string;
}[] = [
  {
    key: "LIVING_IT",
    name: "I'M LIVING IT",
    targetPercent: 40,
    description:
      "Trisha doing the thing. Today's card told her to do something; she did it; here is what happened. Mundane is good — mundane is what makes the movement believable.",
    whatItIsNot: "Not teaching. Documenting. There is no lesson at the end.",
    color: "#1E6F4C",
  },
  {
    key: "PEOPLE_LIVING_IT",
    name: "PEOPLE ARE LIVING IT",
    targetPercent: 25,
    description:
      "Someone else's evidence — a testimonial, a screenshot, a win, an unexpected result. Reposted with a real reaction and an invitation.",
    whatItIsNot:
      "Not a customer quote wall. The point is behaviour-setting: when I do something because of Wealth Daily, I share the evidence.",
    color: "#A0650F",
  },
  {
    key: "THE_IDEA",
    name: "THE IDEA",
    targetPercent: 20,
    description:
      "Bold, simple beliefs. Short lines. These make people understand what Wealth Daily stands for.",
    whatItIsNot: "Not advertisements. Beliefs. Never a feature in disguise.",
    color: "#2B4A7D",
  },
  {
    key: "BEHIND_THE_WORLD",
    name: "BEHIND THE WORLD",
    targetPercent: 15,
    description:
      "What Trisha is building — a deck being designed, an author's book becoming an experience. Where the author/coach audience quietly recognises itself.",
    whatItIsNot:
      "Never corporate B2B mode. No value propositions. It arrives as 'this is my favourite part'.",
    color: "#6B3A67",
  },
];

export const SERIES: {
  key: SeriesKey;
  name: string;
  bucketKey: BucketKey;
  promptQuestions: string[];
  structureSkeleton: string;
  examples: string[];
}[] = [
  {
    key: "TODAY_I_LIVED_IT",
    name: "TODAY I LIVED IT",
    bucketKey: "LIVING_IT",
    promptQuestions: [
      "What did today's card tell you to do?",
      "Did you want to do it? Be honest.",
      "Did you do it anyway?",
      "What actually happened?",
    ],
    structureSkeleton:
      "Assignment → resistance → did it anyway → what happened → proof mark. Open on the resistance, never on the insight.",
    examples: [
      "Today's card told me to ______.\n\nDidn't particularly feel like doing it. 😂\n\nDid it anyway.\n\nHere's what happened…",
      "It started with picking up pennies.\n\nThen $1.\n\nThen $20.\n\nThen a completely unexpected $3,000 check showed up.\n\nThis is why I'm obsessed with experimenting with the things I read instead of just reading them.",
      "Today's card told me to do ______ for my husband.\n\nHere's what happened…",
    ],
  },
  {
    key: "SOMEONE_LIVED_IT",
    name: "SOMEONE LIVED IT",
    bucketKey: "PEOPLE_LIVING_IT",
    promptQuestions: [
      "Who did the thing, and what did they do?",
      "How far in were they — what day?",
      "What is your honest reaction to it?",
    ],
    structureSkeleton:
      "Their evidence → your genuine reaction → what LIVE IT means → the invitation back to the reader.",
    examples: [
      "LOOK WHAT SARAH DID. 😭\n\nDay 12 of ______.\n\nThis is what LIVE IT means.\n\nNot learning more.\n\nActually doing something with what you already know.\n\nWhat did YOU live today?",
    ],
  },
  {
    key: "TRY_THIS",
    name: "TRY THIS",
    bucketKey: "THE_IDEA",
    promptQuestions: [
      "What is the one action you want them to take today?",
      "How small can you make it?",
      "What belief sits underneath it?",
    ],
    structureSkeleton: "The belief, stated flat → the action, made tiny → the invitation.",
    examples: [
      "STOP READING PERSONAL DEVELOPMENT BOOKS.\n\nOkay. Not literally. 😂\n\nBut before you buy another one…\n\nDo something with the last one.",
      "YOU DON'T NEED MORE INFORMATION.\n\nYou need evidence.",
      "LESS COURSEWORK.\nMORE LIFE WORK.",
      "You highlighted it.\n\nYou saved it.\n\nYou underlined it.\n\nYou told your friend about it.\n\nCool.\n\nDid you do it?",
      "DON'T JUST LEARN IT.\n\nLIVE IT.",
    ],
  },
  {
    key: "FROM_PAGE_TO_PRACTICE",
    name: "FROM PAGE → PRACTICE",
    bucketKey: "THE_IDEA",
    promptQuestions: [
      "Which book or idea are you taking?",
      "What does the book actually say?",
      "What would doing it for 30 days look like?",
    ],
    structureSkeleton: "The idea as written → the experiment it becomes → what you found.",
    examples: [
      "I tried this experiment from The Science of Getting Rich.\n\nHere's what happened…",
    ],
  },
  {
    key: "BUILDING_WEALTH_DAILY",
    name: "BUILDING WEALTH DAILY",
    bucketKey: "BEHIND_THE_WORLD",
    promptQuestions: [
      "What are you working on right now?",
      "Why does it exist — what problem did you hit?",
      "What is the fun part of it?",
    ],
    structureSkeleton:
      "What you're making → why it exists → the detail you're enjoying. Demonstrate the feature by showing evidence, never by announcing it.",
    examples: [
      "Today's proof.\n\nDidn't want to do it.\n\nDid it anyway.\n\nDay 6. ✓\n\nI'm collecting these in Wealth Daily because apparently I need receipts that I'm actually changing. 😂",
    ],
  },
  {
    key: "IMAGINE_YOUR_IP_LIKE_THIS",
    name: "IMAGINE YOUR IP LIKE THIS",
    bucketKey: "BEHIND_THE_WORLD",
    promptQuestions: [
      "Whose work, or which book, are you transforming?",
      "What does the ladder look like for it?",
      "What would their audience actually DO?",
    ],
    structureSkeleton:
      "BOOK → ACTIVITY EXPERIENCE → CARD DECK → STICKERS → CHALLENGE → COMMUNITY → PHYSICAL WORKBOOK + QR, then: imagine this was YOUR book.",
    examples: [
      "I'm working on something for an author today and this is exactly why I built Wealth Daily.\n\nThey already have YEARS of incredible IP.\n\nThey don't need another course.\n\nI'm taking their ideas and turning them into things their audience can actually DO.\n\nActivities.\n\nExperiments.\n\nA card deck.\n\nChallenges.\n\nAnd the entire experience looks like THEIR brand.\n\nThis is my favorite part.",
      "This is what I mean when I tell authors I don't just want to put their book inside an app.\n\nImagine someone reads YOUR idea…\n\nthen spends 30 days actually testing it.\n\nThat's what I want to build.",
    ],
  },
];

export const WEEKLY_SLOTS: {
  key: string;
  dayOfWeek: number;
  label: string;
  bucketKey: BucketKey;
  defaultSeriesKey: SeriesKey;
}[] = [
  { key: "mon", dayOfWeek: 1, label: "LIVE IT", bucketKey: "LIVING_IT", defaultSeriesKey: "TODAY_I_LIVED_IT" },
  { key: "tue", dayOfWeek: 2, label: "THE IDEA", bucketKey: "THE_IDEA", defaultSeriesKey: "TRY_THIS" },
  { key: "thu", dayOfWeek: 4, label: "PROOF", bucketKey: "PEOPLE_LIVING_IT", defaultSeriesKey: "SOMEONE_LIVED_IT" },
  { key: "sat", dayOfWeek: 6, label: "BUILDING", bucketKey: "BEHIND_THE_WORLD", defaultSeriesKey: "BUILDING_WEALTH_DAILY" },
];

export const STRATEGY_PROFILE = {
  oneStory:
    "I spent years consuming personal development. Now I'm experimenting with actually living it. I built Wealth Daily to help me do that. I'm inviting other people to LIVE IT with me — and I'm helping authors and coaches turn their teachings into things people can actually practice.",
  audiences: [
    { who: "Consumer", thought: "I want to do this." },
    { who: "Author or coach", thought: "I want my audience doing this with MY work." },
  ],
  voiceRules: [
    "Open on the resistance, not the lesson. Assignment → resistance → did it anyway → what happened.",
    "Never explain the moral. The reader supplies it. This is documentation, not teaching.",
    "End on an open loop. Stop one beat before the conclusion.",
    "Short lines. Real white space between them. Often one sentence per line.",
    "Specific nouns over summary: 'Trader Joe's' not 'the store'; '$3,000 check' not 'unexpected money'.",
    "Use escalation ladders where the story has one: pennies → $1 → $20 → $3,000.",
    "Mundane is an asset. Never inflate a small result — the ordinariness is what makes it believable.",
    "Self-deprecation is the trust mechanism. Laugh at your own resistance; that is what stops it reading as preachy.",
    "Emoji sparingly, as tone, never as decoration and never as section markers.",
    "The ask is an invitation, never a platform instruction: a question a friend would ask, answerable in about four words, about the reader rather than about Trisha.",
    "Demonstrate features by showing the evidence, never by announcing them.",
    "Vary the opener. Do not begin consecutive posts the same way.",
  ],
  doNotList: [
    "Never write feature announcements: 'WEALTH DAILY HAS STREAKS!', 'WEALTH DAILY HAS CARD DECKS!', 'DOWNLOAD WEALTH DAILY!', 'AUTHORS — JOIN MY PLATFORM!'",
    "Never use platform-instruction CTAs: 'Comment below!', 'Tag a friend! 👇', 'Double tap if you agree!', 'Link in bio!'",
    "Never ask a big abstract question such as 'What's your biggest struggle with personal development?' — it does not get answered.",
    "Never open with teaching voice: 'Here's what I learned…', '3 things this taught me', 'Remember:'.",
    "Never write in corporate B2B register. No value propositions, no 'solutions', no 'leverage'.",
    "Never claim a result that did not happen, and never round a small win up into a big one.",
    "Never use hashtag walls. At most a few, and only where they read naturally.",
  ],
  ctaRotation: [
    "Try this today.",
    "Show me your proof.",
    "Come LIVE IT with us.",
    "Save this and actually DO it.",
    "Send this to someone who needs to do it with you.",
    "What did YOU live today?",
    "Imagine your IP like this.",
    "If you have a book or framework you'd love to turn into an experience, message me \"LIVE IT\".",
  ],
  openerBank: [
    "Today's card told me to…",
    "I didn't want to do this.",
    "It started with…",
    "Okay this is small but…",
    "LOOK WHAT ______ DID.",
    "I tried this experiment from…",
    "I'm working on something for an author today…",
    "You highlighted it. You saved it. You underlined it.",
  ],
  profileBio:
    "Building Wealth Daily. LIVE IT = turning personal development into action. Authors & coaches: your audience doesn't need another course.",
  pinnedPosts: [
    {
      title: "WHAT IS LIVE IT?",
      brief:
        "The manifesto. Years of consuming personal development, now experimenting with actually living it. What LIVE IT means and why evidence beats information.",
    },
    {
      title: "WHAT IS WEALTH DAILY?",
      brief:
        "Show someone actually using it — a card, an action, a photo of proof, a streak of evidence. Demonstrate, never announce.",
    },
    {
      title: "FOR AUTHORS + COACHES",
      brief:
        "Your audience doesn't need another course. Give them something to LIVE. Show the ecosystem: book → activities → deck → stickers → challenge → community → workbook.",
    },
  ],
};

export const STORY_PROMPTS: string[] = [
  "Walking Lolo and doing today's activity? Take a picture. 'Today's LIVE IT ☝️'",
  "Designing a card deck? Screen recording. 'Building something fun today 👀'",
  "Someone sent you a result? Screenshot it. 'THIS. This is why I'm building this.'",
  "Finished something? Picture. 'Proof. ✓'",
  "Don't feel like today's activity? Even better. Say so, then post the after: 'Did it. Annoyingly glad I did. 😂'",
  "Mid-build on something for an author? Show the screen. No explanation needed.",
  "Bought or reread a book? Photo. 'What would you actually DO with this?'",
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/seed/strategy.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the seed script**

`scripts/seed.ts`:

```typescript
import "dotenv/config";
import { dbConnect } from "@/lib/db";
import Bucket from "@/models/Bucket";
import Series from "@/models/Series";
import WeeklySlot from "@/models/WeeklySlot";
import StrategyProfile from "@/models/StrategyProfile";
import StoryPrompt from "@/models/StoryPrompt";
import { BUCKETS, SERIES, WEEKLY_SLOTS, STRATEGY_PROFILE, STORY_PROMPTS } from "@/seed/strategy";

async function main() {
  await dbConnect();

  for (const b of BUCKETS) await Bucket.updateOne({ key: b.key }, b, { upsert: true });
  for (const s of SERIES) await Series.updateOne({ key: s.key }, s, { upsert: true });
  for (const w of WEEKLY_SLOTS) await WeeklySlot.updateOne({ key: w.key }, w, { upsert: true });

  await StrategyProfile.updateOne({ singleton: "the-one" }, STRATEGY_PROFILE, { upsert: true });

  await StoryPrompt.deleteMany({});
  await StoryPrompt.insertMany(STORY_PROMPTS.map((text) => ({ text })));

  console.log(
    `Seeded ${BUCKETS.length} buckets, ${SERIES.length} series, ${WEEKLY_SLOTS.length} slots, ${STORY_PROMPTS.length} story prompts.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Add to `tsconfig.json` nothing further — `tsx` resolves `@/*` from the `paths` entry via `tsconfig`. If it does not, run scripts with `tsx --tsconfig tsconfig.json`.

- [ ] **Step 6: Run the seed against a local MongoDB**

Run: `cp .env.example .env.local` then set `MONGODB_URI`, then `npm run seed`
Expected: prints `Seeded 4 buckets, 6 series, 4 slots, 7 story prompts.`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: seed the strategy brain — buckets, series, slots, voice rules"
```

---

### Task 5: Authentication

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/me/route.ts`, `src/app/login/page.tsx`, `src/middleware.ts`, `scripts/seed-admin.ts`
- Test: `tests/lib/auth.test.ts`

**Interfaces:**
- Consumes: `User` model, `dbConnect`
- Produces: `signToken(userId)`, `verifyToken(token)`, `hashPassword(pw)`, `verifyPassword(pw, hash)`, `currentUserId(req)` from `@/lib/auth`; cookie name constant `AUTH_COOKIE`.

- [ ] **Step 1: Write the failing test**

`tests/lib/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("auth tokens", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("round-trips a user id through sign and verify", async () => {
    const { signToken, verifyToken } = await import("@/lib/auth");
    expect(verifyToken(signToken("abc123"))).toBe("abc123");
  });

  it("returns null for a token signed with a different secret", async () => {
    const { signToken, verifyToken } = await import("@/lib/auth");
    const token = signToken("abc123");
    process.env.JWT_SECRET = "a-different-secret";
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for a malformed token rather than throwing", async () => {
    const { verifyToken } = await import("@/lib/auth");
    expect(verifyToken("not-a-token")).toBeNull();
  });

  it("verifies a password against its own hash and rejects others", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth");
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/lib/auth.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth`.

- [ ] **Step 3: Write the auth library**

`src/lib/auth.ts`:

```typescript
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const AUTH_COOKIE = "live_it_token";
const EXPIRY = "7d";

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: EXPIRY });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, secret());
    return typeof payload === "object" && payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function currentUserId(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  return match ? verifyToken(match[1]) : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/lib/auth.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the routes, login page and middleware**

`src/app/api/auth/login/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { AUTH_COOKIE, signToken, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  await dbConnect();

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
    return NextResponse.json({ error: "That email and password don't match." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, signToken(String(user._id)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
```

`src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
```

`src/app/api/auth/me/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { currentUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const id = currentUserId(request);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await dbConnect();
  const user = await User.findById(id).select("email name");
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return NextResponse.json({ email: user.email, name: user.name ?? null });
}
```

`src/middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  // Presence check only — middleware runs on the edge runtime, where the
  // jsonwebtoken verify path is unavailable. Routes verify the signature.
  if (!request.cookies.get(AUTH_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

`src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) router.push("/");
    else setError((await res.json()).error ?? "Sign in failed.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold tracking-tight">LIVE IT Engine</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" autoComplete="username" required
          className="rounded border border-stone-300 px-3 py-2"
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" autoComplete="current-password" required
          className="rounded border border-stone-300 px-3 py-2"
        />
        <button type="submit" disabled={busy} className="rounded bg-living px-3 py-2 font-medium text-white disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </main>
  );
}
```

`scripts/seed-admin.ts`:

```typescript
import "dotenv/config";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");

  await dbConnect();
  await User.updateOne(
    { email: email.toLowerCase().trim() },
    { email: email.toLowerCase().trim(), passwordHash: await hashPassword(password) },
    { upsert: true }
  );
  console.log(`Account ready: ${email}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 6: Verify sign-in works end to end**

Run: `npm run seed:admin` then `npm run dev`, open `http://localhost:3000`
Expected: redirected to `/login`; signing in with the seeded credentials lands on `/` (which 404s until Task 10 — that is correct at this point).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add JWT cookie auth, login page and seeded account"
```

---

### Task 6: The Wealth Daily read-only source

**Files:**
- Create: `src/lib/wealthdaily/client.ts`, `src/lib/wealthdaily/map.ts`, `src/lib/wealthdaily/source.ts`, `scripts/check-source.ts`
- Test: `tests/lib/wealthdaily/map.test.ts`, `tests/lib/wealthdaily/source.test.ts`

**Interfaces:**
- Consumes: `CardCandidate` from `@/types`
- Produces from `@/lib/wealthdaily/source`: `getTodaysCardCandidates(limit?)`, `getDeckCatalogue()`, `getRecentlyShipped()`, `getProofCandidates()`, `getAuthorSignals()`, `getCoverageGaps(postedProductIds)`, `getAggregateSignals()`. Produces `sql()` (nullable client) from `@/lib/wealthdaily/client`; `i18n(value)`, `mapCardRow(row)` from `@/lib/wealthdaily/map`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/wealthdaily/map.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { i18n, mapCardRow } from "@/lib/wealthdaily/map";

describe("i18n", () => {
  it("reads the English value out of a translation object", () => {
    expect(i18n({ en: "Give a genuine compliment", es: "Da un cumplido" })).toBe("Give a genuine compliment");
  });

  it("falls back to the first available value when there is no English", () => {
    expect(i18n({ es: "Da un cumplido" })).toBe("Da un cumplido");
  });

  it("passes a plain string through", () => {
    expect(i18n("Just a string")).toBe("Just a string");
  });

  it("returns an empty string for null, undefined or an empty object", () => {
    expect(i18n(null)).toBe("");
    expect(i18n(undefined)).toBe("");
    expect(i18n({})).toBe("");
  });
});

describe("mapCardRow", () => {
  it("prefers the deck front text, which is what a reader actually sees", () => {
    const card = mapCardRow({
      activity_id: "a1",
      product_id: "p1",
      deck_front: { title: { en: "Compliment a stranger" } },
      instructions: { en: "Go and do it" },
      title: { en: "Day 14" },
      product_title: "Love Your Person",
      chapter_title: { en: "Chapter 2" },
    });
    expect(card.text).toBe("Compliment a stranger");
    expect(card.productId).toBe("p1");
    expect(card.productTitle).toBe("Love Your Person");
    expect(card.chapterTitle).toBe("Chapter 2");
  });

  it("falls back to instructions, then the title, when there is no deck front", () => {
    expect(
      mapCardRow({ activity_id: "a1", product_id: "p1", deck_front: null, instructions: { en: "Go and do it" }, title: { en: "Day 14" }, product_title: "P", chapter_title: null }).text
    ).toBe("Go and do it");
    expect(
      mapCardRow({ activity_id: "a1", product_id: "p1", deck_front: null, instructions: null, title: { en: "Day 14" }, product_title: "P", chapter_title: null }).text
    ).toBe("Day 14");
  });

  it("returns a null chapterTitle when the card has no chapter", () => {
    expect(
      mapCardRow({ activity_id: "a1", product_id: "p1", deck_front: null, instructions: null, title: { en: "T" }, product_title: "P", chapter_title: null }).chapterTitle
    ).toBeNull();
  });
});
```

`tests/lib/wealthdaily/source.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("wealthdaily source with no connection configured", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.WEALTH_DAILY_DATABASE_URL;
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/wealthdaily`
Expected: FAIL — modules do not resolve.

- [ ] **Step 3: Write the client and mapping**

`src/lib/wealthdaily/client.ts`:

```typescript
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const cache = globalThis as unknown as { _wdSql?: Sql | null };

/**
 * The read-only Wealth Daily connection, or null when unconfigured.
 * Callers must handle null — the app works without it.
 */
export function sql(): Sql | null {
  if (cache._wdSql !== undefined) return cache._wdSql;

  const url = process.env.WEALTH_DAILY_DATABASE_URL;
  cache._wdSql = url ? postgres(url, { prepare: false, max: 2, idle_timeout: 20 }) : null;
  return cache._wdSql;
}

export function isConnected(): boolean {
  return sql() !== null;
}
```

`src/lib/wealthdaily/map.ts`:

```typescript
import type { CardCandidate } from "@/types";

/** Wealth Daily stores translatable text as `{ en: "...", es: "..." }`. */
export function i18n(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    const first = Object.values(obj).find((v) => typeof v === "string");
    if (typeof first === "string") return first;
  }
  return "";
}

export type CardRow = {
  activity_id: string;
  product_id: string;
  deck_front: unknown;
  instructions: unknown;
  title: unknown;
  product_title: string;
  chapter_title: unknown;
};

export function mapCardRow(row: CardRow): CardCandidate {
  const front = row.deck_front as { title?: unknown; text?: unknown } | null;
  const text =
    i18n(front?.title) || i18n(front?.text) || i18n(row.instructions) || i18n(row.title);
  const chapter = i18n(row.chapter_title);
  return {
    activityId: row.activity_id,
    productId: row.product_id,
    text,
    productTitle: row.product_title,
    chapterTitle: chapter === "" ? null : chapter,
  };
}
```

- [ ] **Step 4: Write the source queries**

`src/lib/wealthdaily/source.ts`:

```typescript
import { sql } from "./client";
import { mapCardRow, i18n, type CardRow } from "./map";
import type { CardCandidate } from "@/types";

export type Shipped = { id: string; title: string; isNew: boolean; featured: boolean; comingSoon: boolean };
export type Deck = { productId: string; title: string; cardCount: number };
export type Proof = { quote: string; name: string; detail: string | null };
export type AuthorSignal = { name: string; productTitle: string };

/** Real card text, newest chapters first. Deck-style activities only. */
export async function getTodaysCardCandidates(limit = 40): Promise<CardCandidate[]> {
  const db = sql();
  if (!db) return [];
  const rows = await db<CardRow[]>`
    SELECT a.id AS activity_id, p.id AS product_id,
           a.deck_front, a.instructions, a.title,
           p.title AS product_title, l.title AS chapter_title
    FROM activities a
    JOIN products p ON p.id = a.product_id
    LEFT JOIN levels l ON l.id = a.chapter_id
    WHERE a.is_active = true AND a.is_intro = false AND p.status = 'published'
    ORDER BY p.title, a.sort_order
    LIMIT ${limit}
  `;
  return rows.map(mapCardRow).filter((c) => c.text.length > 0);
}

export async function getDeckCatalogue(): Promise<Deck[]> {
  const db = sql();
  if (!db) return [];
  const rows = await db<{ product_id: string; title: string; card_count: string }[]>`
    SELECT p.id AS product_id, p.title, count(a.id) AS card_count
    FROM products p
    LEFT JOIN activities a ON a.product_id = p.id AND a.is_active = true
    WHERE p.status = 'published'
    GROUP BY p.id, p.title
    ORDER BY p.title
  `;
  return rows.map((r) => ({ productId: r.product_id, title: r.title, cardCount: Number(r.card_count) }));
}

export async function getRecentlyShipped(): Promise<Shipped[]> {
  const db = sql();
  if (!db) return [];
  const rows = await db<{ id: string; title: string; is_new: boolean; featured: boolean; coming_soon: boolean }[]>`
    SELECT id, title, is_new, featured, coming_soon
    FROM products
    WHERE status = 'published' AND (is_new = true OR featured = true OR coming_soon = true)
    ORDER BY updated_at DESC
    LIMIT 20
  `;
  return rows.map((r) => ({
    id: r.id, title: r.title, isNew: r.is_new, featured: r.featured, comingSoon: r.coming_soon,
  }));
}

/** Testimonials only — published by their own nature, so safe to quote. */
export async function getProofCandidates(): Promise<Proof[]> {
  const db = sql();
  if (!db) return [];
  const rows = await db<{ quote: string; name: string; detail: string | null }[]>`
    SELECT quote, name, detail FROM testimonials
    WHERE published = true
    ORDER BY sort_order, created_at DESC
    LIMIT 50
  `;
  return rows.map((r) => ({ quote: r.quote, name: r.name, detail: r.detail }));
}

export async function getAuthorSignals(): Promise<AuthorSignal[]> {
  const db = sql();
  if (!db) return [];
  const rows = await db<{ name: string | null; product_title: string }[]>`
    SELECT c.name, p.title AS product_title
    FROM products p
    JOIN coaches c ON c.id = p.coach_id
    WHERE p.status = 'published'
    ORDER BY p.updated_at DESC
    LIMIT 20
  `;
  return rows.map((r) => ({ name: r.name ?? "an author", productTitle: r.product_title }));
}

/** Published products with no post referencing them yet. */
export async function getCoverageGaps(postedProductIds: string[]): Promise<Deck[]> {
  const all = await getDeckCatalogue();
  const posted = new Set(postedProductIds);
  return all.filter((d) => !posted.has(d.productId));
}

/**
 * Reader-activity aggregates. The development database holds no reader
 * activity by design, so this is always null in v1. Kept so that repointing
 * at the live store lights it up with no other change.
 */
export async function getAggregateSignals(): Promise<null> {
  return null;
}

export { i18n };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- tests/lib/wealthdaily`
Expected: PASS, 10 tests.

- [ ] **Step 6: Write the drift probe**

`scripts/check-source.ts`:

```typescript
import "dotenv/config";
import { isConnected } from "@/lib/wealthdaily/client";
import * as source from "@/lib/wealthdaily/source";

const PROBES: [string, () => Promise<unknown>][] = [
  ["getTodaysCardCandidates", () => source.getTodaysCardCandidates(1)],
  ["getDeckCatalogue", () => source.getDeckCatalogue()],
  ["getRecentlyShipped", () => source.getRecentlyShipped()],
  ["getProofCandidates", () => source.getProofCandidates()],
  ["getAuthorSignals", () => source.getAuthorSignals()],
];

async function main() {
  if (!isConnected()) {
    console.log("WEALTH_DAILY_DATABASE_URL is not set — nothing to check.");
    process.exit(0);
  }

  let failed = 0;
  for (const [name, run] of PROBES) {
    try {
      const rows = await run();
      console.log(`  ok    ${name} (${Array.isArray(rows) ? rows.length : 0} rows)`);
    } catch (e) {
      failed += 1;
      console.log(`  BROKE ${name}: ${(e as Error).message}`);
    }
  }
  console.log(failed === 0 ? "\nAll source queries still work." : `\n${failed} query/queries need updating.`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
```

- [ ] **Step 7: Verify the probe against the dev database**

Set `WEALTH_DAILY_DATABASE_URL` in `.env.local` to the read-only role on the Wealth Daily **development** Supabase project, then run: `npm run check:source`
Expected: five `ok` lines with non-zero row counts, and `All source queries still work.`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add read-only Wealth Daily content source with drift probe"
```

---

### Task 7: Prompt assembly

The craft rules become a prompt here. This module is pure and is the most important thing to get right.

**Files:**
- Create: `src/lib/agent/prompt.ts`
- Test: `tests/lib/agent/prompt.test.ts`

**Interfaces:**
- Consumes: `nextCta`, `recentOpeners` from `@/lib/rotation`; types from `@/types`
- Produces: `DraftContext` type and `buildSystemPrompt(ctx)`, `buildUserMessage(ctx)` from `@/lib/agent/prompt`

- [ ] **Step 1: Write the failing test**

`tests/lib/agent/prompt.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserMessage, type DraftContext } from "@/lib/agent/prompt";

const CTX: DraftContext = {
  profile: {
    oneStory: "I spent years consuming personal development.",
    voiceRules: ["Open on the resistance, not the lesson.", "Never explain the moral."],
    doNotList: ["Never write 'DOWNLOAD WEALTH DAILY!'", "Never use 'Comment below!'"],
    ctaRotation: ["Try this today.", "Show me your proof.", "What did YOU live today?"],
  },
  bucket: {
    key: "LIVING_IT",
    name: "I'M LIVING IT",
    description: "Trisha doing the thing.",
    whatItIsNot: "Not teaching. Documenting.",
  },
  series: {
    key: "TODAY_I_LIVED_IT",
    name: "TODAY I LIVED IT",
    structureSkeleton: "Assignment → resistance → did it anyway → what happened.",
    examples: ["Today's card told me to ______."],
  },
  lens: "consumer",
  card: { activityId: "a1", productId: "p1", text: "Compliment a stranger", productTitle: "Love Your Person", chapterTitle: "Chapter 2" },
  recentCaptions: ["Today's card told me to pick up a penny today", "I did not want to do this one"],
  recentCtas: ["Try this today."],
  rawNotes: "trader joe's, guy teared up",
};

describe("buildSystemPrompt", () => {
  it("carries the one story", () => {
    expect(buildSystemPrompt(CTX)).toContain("I spent years consuming personal development.");
  });

  it("names the bucket and what it is not", () => {
    const p = buildSystemPrompt(CTX);
    expect(p).toContain("I'M LIVING IT");
    expect(p).toContain("Not teaching. Documenting.");
  });

  it("includes the series skeleton and its examples", () => {
    const p = buildSystemPrompt(CTX);
    expect(p).toContain("Assignment → resistance");
    expect(p).toContain("Today's card told me to ______.");
  });

  it("includes every voice rule and every prohibition", () => {
    const p = buildSystemPrompt(CTX);
    for (const r of CTX.profile.voiceRules) expect(p).toContain(r);
    for (const d of CTX.profile.doNotList) expect(p).toContain(d);
  });

  it("names the chosen CTA and excludes the one just used", () => {
    const p = buildSystemPrompt(CTX);
    expect(p).toContain("Show me your proof.");
    expect(p).not.toContain('Use this call to action, word for word: "Try this today."');
  });

  it("lists recent openers as shapes to avoid", () => {
    const p = buildSystemPrompt(CTX);
    expect(p).toContain("I did not want to");
    expect(p).toMatch(/do not (re)?use|avoid/i);
  });

  it("states the consumer lens", () => {
    expect(buildSystemPrompt(CTX)).toMatch(/something (you|they) can LIVE/i);
  });

  it("switches the invitation when the lens is creator", () => {
    const p = buildSystemPrompt({ ...CTX, lens: "creator" });
    expect(p).toMatch(/YOUR audience could LIVE/i);
  });
});

describe("buildUserMessage", () => {
  it("includes the raw notes", () => {
    expect(buildUserMessage(CTX)).toContain("trader joe's, guy teared up");
  });

  it("includes the real card text and where it came from", () => {
    const m = buildUserMessage(CTX);
    expect(m).toContain("Compliment a stranger");
    expect(m).toContain("Love Your Person");
    expect(m).toContain("Chapter 2");
  });

  it("omits the card section entirely when there is no card", () => {
    expect(buildUserMessage({ ...CTX, card: null })).not.toContain("Love Your Person");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/lib/agent/prompt.test.ts`
Expected: FAIL — cannot resolve `@/lib/agent/prompt`.

- [ ] **Step 3: Write the prompt builder**

`src/lib/agent/prompt.ts`:

```typescript
import { nextCta, recentOpeners } from "@/lib/rotation";
import type { BucketKey, CardCandidate, Lens, SeriesKey } from "@/types";

export type DraftContext = {
  profile: { oneStory: string; voiceRules: string[]; doNotList: string[]; ctaRotation: string[] };
  bucket: { key: BucketKey; name: string; description: string; whatItIsNot: string };
  series: { key: SeriesKey; name: string; structureSkeleton: string; examples: string[] };
  lens: Lens;
  card: CardCandidate | null;
  recentCaptions: string[];
  recentCtas: string[];
  rawNotes: string;
};

const LENS_LINE: Record<Lens, string> = {
  consumer: "Write it for a reader who could do this themselves. The invitation is: here's something you can LIVE.",
  creator:
    "Write it for an author or coach reading over the reader's shoulder. The invitation is: here's what YOUR audience could LIVE. Never switch into corporate B2B register to do it.",
};

function numbered(lines: string[]): string {
  return lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
}

export function buildSystemPrompt(ctx: DraftContext): string {
  const cta = nextCta(ctx.profile.ctaRotation, ctx.recentCtas);
  const openers = recentOpeners(ctx.recentCaptions);

  return `You write social media captions as Trisha, who is building Wealth Daily.

# The one story every post tells
${ctx.profile.oneStory}

# This post's bucket: ${ctx.bucket.name}
${ctx.bucket.description}
What this bucket is NOT: ${ctx.bucket.whatItIsNot}

# This post's series: ${ctx.series.name}
Structure: ${ctx.series.structureSkeleton}

Examples of this series, written by Trisha. Match their rhythm and line breaks, never their exact words:
${ctx.series.examples.map((e) => `---\n${e}`).join("\n")}

# Lens
${LENS_LINE[ctx.lens]}

# Voice rules — follow every one
${numbered(ctx.profile.voiceRules)}

# Absolute prohibitions — breaking any of these makes the post unusable
${numbered(ctx.profile.doNotList)}

# Call to action
Use this call to action, word for word: "${cta}"
It is an invitation, not an instruction. Place it on its own line at the end.

# Openers to avoid
These are how Trisha's recent posts opened. Do not reuse their shape or wording:
${openers.length > 0 ? openers.map((o) => `- ${o}`).join("\n") : "- (no recent posts yet)"}

# What to produce
Three complete captions, each taking a genuinely different structural angle on the same true story — not three rewordings of one caption. Three alternative opening lines. Platform variants: Instagram (as written), LinkedIn (same story, slightly more context, no hashtags), Facebook/Threads (shorter, punchier). A suggested visual describing what Trisha should photograph or record. A Stories version: one or two messy lines she could put over a photo.

Never invent a detail that is not in her notes. If the notes are thin, keep the caption short rather than padding it.`;
}

export function buildUserMessage(ctx: DraftContext): string {
  const card = ctx.card
    ? `The card she did:
"${ctx.card.text}"
From: ${ctx.card.productTitle}${ctx.card.chapterTitle ? ` · ${ctx.card.chapterTitle}` : ""}

`
    : "";

  return `${card}Her notes on what actually happened:
${ctx.rawNotes.trim() || "(none yet — write from the card alone and keep it short)"}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/lib/agent/prompt.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: assemble the agent prompt from strategy, series and real card data"
```

---

### Task 8: The agent

**Files:**
- Create: `src/lib/agent/schema.ts`, `src/lib/agent/generate.ts`, `src/app/api/agent/draft/route.ts`
- Test: `tests/lib/agent/generate.test.ts`

**Interfaces:**
- Consumes: `buildSystemPrompt`, `buildUserMessage`, `DraftContext` from `@/lib/agent/prompt`
- Produces: `DraftSchema`, `ClassifiedDraftSchema`, `Draft` type from `@/lib/agent/schema`; `generateDraft(ctx)`, `classifyAndDraft(ctx)` from `@/lib/agent/generate`

- [ ] **Step 1: Write the zod contract**

`src/lib/agent/schema.ts`:

```typescript
import { z } from "zod";
import { BUCKET_KEYS, SERIES_KEYS } from "@/types";

export const DraftSchema = z.object({
  captions: z.array(z.string()).length(3),
  hooks: z.array(z.string()).length(3),
  cta: z.string(),
  platformVariants: z.object({
    instagram: z.string(),
    linkedin: z.string(),
    facebook_threads: z.string(),
  }),
  suggestedVisual: z.string(),
  storyVersion: z.string(),
});

export type Draft = z.infer<typeof DraftSchema>;

/** Used by the CLI, where the bucket is not known in advance. */
export const ClassifiedDraftSchema = DraftSchema.extend({
  bucketKey: z.enum(BUCKET_KEYS),
  seriesKey: z.enum(SERIES_KEYS),
  classificationReason: z.string(),
});

export type ClassifiedDraft = z.infer<typeof ClassifiedDraftSchema>;
```

- [ ] **Step 2: Write the failing test**

`tests/lib/agent/generate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DraftContext } from "@/lib/agent/prompt";

const parse = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse };
  },
}));

const CTX: DraftContext = {
  profile: { oneStory: "story", voiceRules: ["rule"], doNotList: ["never"], ctaRotation: ["Try this today."] },
  bucket: { key: "LIVING_IT", name: "I'M LIVING IT", description: "d", whatItIsNot: "n" },
  series: { key: "TODAY_I_LIVED_IT", name: "TODAY I LIVED IT", structureSkeleton: "s", examples: ["e"] },
  lens: "consumer",
  card: null,
  recentCaptions: [],
  recentCtas: [],
  rawNotes: "picked up a penny",
};

const GOOD = {
  captions: ["a", "b", "c"],
  hooks: ["h1", "h2", "h3"],
  cta: "Try this today.",
  platformVariants: { instagram: "i", linkedin: "l", facebook_threads: "f" },
  suggestedVisual: "hold the card up",
  storyVersion: "did it ✓",
};

describe("generateDraft", () => {
  beforeEach(() => {
    parse.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns the parsed draft", async () => {
    parse.mockResolvedValue({ parsed_output: GOOD });
    const { generateDraft } = await import("@/lib/agent/generate");
    expect((await generateDraft(CTX)).captions).toHaveLength(3);
  });

  it("calls the model named in the spec, with adaptive thinking", async () => {
    parse.mockResolvedValue({ parsed_output: GOOD });
    const { generateDraft } = await import("@/lib/agent/generate");
    await generateDraft(CTX);
    const args = parse.mock.calls[0][0];
    expect(args.model).toBe("claude-opus-5");
    expect(args.thinking).toEqual({ type: "adaptive" });
    expect(args.budget_tokens).toBeUndefined();
  });

  it("marks the system prompt cacheable so repeat drafting reuses the prefix", async () => {
    parse.mockResolvedValue({ parsed_output: GOOD });
    const { generateDraft } = await import("@/lib/agent/generate");
    await generateDraft(CTX);
    const args = parse.mock.calls[0][0];
    expect(args.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws a clear error when the model returns nothing parseable", async () => {
    parse.mockResolvedValue({ parsed_output: null });
    const { generateDraft } = await import("@/lib/agent/generate");
    await expect(generateDraft(CTX)).rejects.toThrow("could not be parsed");
  });

  it("throws a clear error when no API key is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
    const { generateDraft } = await import("@/lib/agent/generate");
    await expect(generateDraft(CTX)).rejects.toThrow("ANTHROPIC_API_KEY");
  });
});

describe("classifyAndDraft", () => {
  beforeEach(() => {
    parse.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns the bucket and series the model chose", async () => {
    parse.mockResolvedValue({
      parsed_output: { ...GOOD, bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", classificationReason: "personal evidence" },
    });
    const { classifyAndDraft } = await import("@/lib/agent/generate");
    const out = await classifyAndDraft(CTX);
    expect(out.bucketKey).toBe("LIVING_IT");
    expect(out.seriesKey).toBe("TODAY_I_LIVED_IT");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- tests/lib/agent/generate.test.ts`
Expected: FAIL — cannot resolve `@/lib/agent/generate`.

- [ ] **Step 4: Write the generator**

`src/lib/agent/generate.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildSystemPrompt, buildUserMessage, type DraftContext } from "./prompt";
import { ClassifiedDraftSchema, DraftSchema, type ClassifiedDraft, type Draft } from "./schema";

const MODEL = "claude-opus-5";

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic();
}

const CLASSIFY_SUFFIX = `

# Also classify this story
The bucket was not chosen in advance. Decide which bucket and series this story belongs to, and say in one line why. A story about Trisha doing something herself is LIVING_IT. Someone else's win is PEOPLE_LIVING_IT. A standalone belief or an action for the reader is THE_IDEA. Something she is making or building is BEHIND_THE_WORLD.`;

async function run<T>(ctx: DraftContext, schema: Parameters<typeof zodOutputFormat>[0], extra: string): Promise<T> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: buildSystemPrompt(ctx) + extra,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(ctx) }],
    output_config: { format: zodOutputFormat(schema) },
  });

  if (!response.parsed_output) {
    throw new Error("The model's response could not be parsed into a draft. Try again.");
  }
  return response.parsed_output as T;
}

export async function generateDraft(ctx: DraftContext): Promise<Draft> {
  return run<Draft>(ctx, DraftSchema, "");
}

export async function classifyAndDraft(ctx: DraftContext): Promise<ClassifiedDraft> {
  return run<ClassifiedDraft>(ctx, ClassifiedDraftSchema, CLASSIFY_SUFFIX);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- tests/lib/agent/generate.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Write the route**

`src/app/api/agent/draft/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { buildDraftContext } from "@/lib/posts";
import { generateDraft } from "@/lib/agent/generate";

export async function POST(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { postId, rawNotes, lens, card } = await request.json();
  await dbConnect();

  const post = await Post.findById(postId);
  if (!post) return NextResponse.json({ error: "That post no longer exists." }, { status: 404 });

  post.rawNotes = rawNotes ?? post.rawNotes;
  if (lens) post.lens = lens;
  if (card) post.sourceCardRef = card;

  try {
    const draft = await generateDraft(await buildDraftContext(post));
    post.generations.push({ ...draft, createdAt: new Date() });
    post.cta = draft.cta;
    post.suggestedVisual = draft.suggestedVisual;
    post.storyVersion = draft.storyVersion;
    post.platformVariants = draft.platformVariants;
    if (post.status === "idea" || post.status === "captured") post.status = "drafted";
    await post.save();
    return NextResponse.json({ draft, postId: String(post._id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add the caption agent with structured output and prompt caching"
```

---

### Task 9: Post service and API

**Files:**
- Create: `src/lib/posts.ts`, `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts`, `src/app/api/strategy/route.ts`
- Test: `tests/lib/posts.test.ts`

**Interfaces:**
- Consumes: models, `weekSlots`/`slotForDate`, `computeMix`
- Produces from `@/lib/posts`: `buildDraftContext(post)`, `placeCaptured(postId, slotKey, date)`, `markPosted(postId, platforms)`, `postedProductIds()`

- [ ] **Step 1: Write the failing test**

`tests/lib/posts.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const findOne = vi.fn();
const find = vi.fn();
vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/StrategyProfile", () => ({ default: { findOne } }));
vi.mock("@/models/Bucket", () => ({ default: { findOne } }));
vi.mock("@/models/Series", () => ({ default: { findOne } }));
vi.mock("@/models/Post", () => ({ default: { find } }));

describe("buildDraftContext", () => {
  beforeEach(() => {
    findOne.mockReset();
    find.mockReset();
  });

  it("assembles a context from the post, its bucket, its series and the profile", async () => {
    findOne
      .mockReturnValueOnce({ lean: () => ({ oneStory: "s", voiceRules: ["v"], doNotList: ["d"], ctaRotation: ["c"] }) })
      .mockReturnValueOnce({ lean: () => ({ key: "LIVING_IT", name: "I'M LIVING IT", description: "d", whatItIsNot: "n" }) })
      .mockReturnValueOnce({ lean: () => ({ key: "TODAY_I_LIVED_IT", name: "TODAY I LIVED IT", structureSkeleton: "sk", examples: ["e"] }) });
    find.mockReturnValue({
      sort: () => ({ limit: () => ({ lean: () => [{ chosenCaption: "old caption here", cta: "Try this today." }] }) }),
    });

    const { buildDraftContext } = await import("@/lib/posts");
    const ctx = await buildDraftContext({
      bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", lens: "consumer",
      rawNotes: "penny", sourceCardRef: null,
    } as never);

    expect(ctx.bucket.name).toBe("I'M LIVING IT");
    expect(ctx.series.key).toBe("TODAY_I_LIVED_IT");
    expect(ctx.rawNotes).toBe("penny");
    expect(ctx.recentCaptions).toEqual(["old caption here"]);
    expect(ctx.recentCtas).toEqual(["Try this today."]);
  });

  it("throws a clear error when the strategy has not been seeded", async () => {
    findOne.mockReturnValue({ lean: () => null });
    const { buildDraftContext } = await import("@/lib/posts");
    await expect(
      buildDraftContext({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", lens: "consumer", rawNotes: "" } as never)
    ).rejects.toThrow("npm run seed");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/lib/posts.test.ts`
Expected: FAIL — cannot resolve `@/lib/posts`.

- [ ] **Step 3: Write the service**

`src/lib/posts.ts`:

```typescript
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import Bucket from "@/models/Bucket";
import Series from "@/models/Series";
import StrategyProfile from "@/models/StrategyProfile";
import type { DraftContext } from "@/lib/agent/prompt";
import type { PlatformKey } from "@/types";

type PostLike = {
  bucketKey: string;
  seriesKey?: string;
  lens?: "consumer" | "creator";
  rawNotes?: string;
  sourceCardRef?: DraftContext["card"];
};

export async function buildDraftContext(post: PostLike): Promise<DraftContext> {
  await dbConnect();

  const profile = await StrategyProfile.findOne({ singleton: "the-one" }).lean();
  if (!profile) throw new Error("The strategy has not been seeded yet. Run: npm run seed");

  const bucket = await Bucket.findOne({ key: post.bucketKey }).lean();
  if (!bucket) throw new Error(`Unknown bucket ${post.bucketKey}. Run: npm run seed`);

  const series = await Series.findOne({ key: post.seriesKey }).lean();
  if (!series) throw new Error(`Unknown series ${post.seriesKey}. Run: npm run seed`);

  const recent = await Post.find({ status: "posted" }).sort({ postedAt: -1 }).limit(8).lean();

  return {
    profile: {
      oneStory: profile.oneStory,
      voiceRules: profile.voiceRules ?? [],
      doNotList: profile.doNotList ?? [],
      ctaRotation: profile.ctaRotation ?? [],
    },
    bucket: {
      key: bucket.key, name: bucket.name,
      description: bucket.description ?? "", whatItIsNot: bucket.whatItIsNot ?? "",
    },
    series: {
      key: series.key, name: series.name,
      structureSkeleton: series.structureSkeleton ?? "", examples: series.examples ?? [],
    },
    lens: post.lens ?? "consumer",
    card: post.sourceCardRef ?? null,
    recentCaptions: recent.map((p) => p.chosenCaption ?? "").filter(Boolean),
    recentCtas: recent.map((p) => p.cta ?? "").filter(Boolean),
    rawNotes: post.rawNotes ?? "",
  };
}

export async function placeCaptured(postId: string, slotKey: string, date: Date) {
  await dbConnect();
  return Post.findByIdAndUpdate(postId, { slotKey, date, status: "drafted" }, { new: true });
}

export async function markPosted(postId: string, platforms: PlatformKey[]) {
  await dbConnect();
  return Post.findByIdAndUpdate(postId, { status: "posted", postedAt: new Date(), platforms }, { new: true });
}

/** Product ids already referenced by a post, for the coverage screen. */
export async function postedProductIds(): Promise<string[]> {
  await dbConnect();
  const posts = await Post.find({ "sourceCardRef.productId": { $exists: true } }).lean();
  return posts.map((p) => p.sourceCardRef?.productId).filter(Boolean) as string[];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/lib/posts.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write the API routes**

`src/app/api/posts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";

export async function GET(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();

  const status = new URL(request.url).searchParams.get("status");
  const posts = await Post.find(status ? { status } : {}).sort({ updatedAt: -1 }).limit(200).lean();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();

  const body = await request.json();
  const post = await Post.create({
    date: body.date ? new Date(body.date) : new Date(),
    slotKey: body.slotKey,
    bucketKey: body.bucketKey,
    seriesKey: body.seriesKey,
    lens: body.lens ?? "consumer",
    status: "idea",
  });
  return NextResponse.json({ post }, { status: 201 });
}
```

`src/app/api/posts/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { markPosted, placeCaptured } from "@/lib/posts";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  await dbConnect();

  if (body.action === "mark_posted") {
    return NextResponse.json({ post: await markPosted(id, body.platforms ?? ["instagram"]) });
  }
  if (body.action === "place") {
    return NextResponse.json({ post: await placeCaptured(id, body.slotKey, new Date(body.date)) });
  }

  const allowed = ["rawNotes", "chosenCaption", "lens", "status", "seriesKey", "sourceCardRef"] as const;
  const update = Object.fromEntries(allowed.filter((k) => k in body).map((k) => [k, body[k]]));
  return NextResponse.json({ post: await Post.findByIdAndUpdate(id, update, { new: true }) });
}
```

`src/app/api/strategy/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import StrategyProfile from "@/models/StrategyProfile";

export async function GET(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();
  return NextResponse.json({ profile: await StrategyProfile.findOne({ singleton: "the-one" }).lean() });
}

export async function PATCH(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();

  const body = await request.json();
  const allowed = ["oneStory", "voiceRules", "doNotList", "ctaRotation", "openerBank", "profileBio"] as const;
  const update = Object.fromEntries(allowed.filter((k) => k in body).map((k) => [k, body[k]]));
  const profile = await StrategyProfile.findOneAndUpdate({ singleton: "the-one" }, update, { new: true });
  return NextResponse.json({ profile });
}
```

- [ ] **Step 6: Typecheck and run the whole suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add post service and API routes"
```

---

### Task 10: The Today dashboard

**Files:**
- Create: `src/app/page.tsx`, `src/components/MixBar.tsx`, `src/components/SlotCard.tsx`, `src/lib/today.ts`
- Test: `tests/lib/today.test.ts`

**Interfaces:**
- Consumes: `weekSlots`, `slotForDate`, `computeMix`, models, `getTodaysCardCandidates`
- Produces: `todayView(now)` from `@/lib/today` returning `{ today, week, mix, captured, storyPrompt }`

- [ ] **Step 1: Write the failing test**

`tests/lib/today.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { withPosts } from "@/lib/today";

const WEEK = [
  { date: new Date("2026-09-21T00:00:00"), slot: { key: "mon", dayOfWeek: 1, bucketKey: "LIVING_IT" as const, defaultSeriesKey: "TODAY_I_LIVED_IT" as const } },
  { date: new Date("2026-09-22T00:00:00"), slot: { key: "tue", dayOfWeek: 2, bucketKey: "THE_IDEA" as const, defaultSeriesKey: "TRY_THIS" as const } },
];

describe("withPosts", () => {
  it("attaches the post that matches a slot on its date", () => {
    const posts = [{ slotKey: "mon", date: new Date("2026-09-21T09:00:00"), status: "posted" }];
    const rows = withPosts(WEEK, posts as never);
    expect(rows[0].post?.status).toBe("posted");
    expect(rows[1].post).toBeNull();
  });

  it("ignores a post with the right slot key but a different week", () => {
    const posts = [{ slotKey: "mon", date: new Date("2026-09-14T09:00:00"), status: "posted" }];
    expect(withPosts(WEEK, posts as never)[0].post).toBeNull();
  });

  it("marks a slot empty when nothing has been written for it", () => {
    expect(withPosts(WEEK, [] as never).every((r) => r.post === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/lib/today.test.ts`
Expected: FAIL — cannot resolve `@/lib/today`.

- [ ] **Step 3: Write the view builder**

`src/lib/today.ts`:

```typescript
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import Bucket from "@/models/Bucket";
import WeeklySlot from "@/models/WeeklySlot";
import StoryPrompt from "@/models/StoryPrompt";
import { slotForDate, weekSlots, startOfWeek, type SlotLike } from "@/lib/schedule";
import { computeMix } from "@/lib/mix";
import type { BucketKey } from "@/types";

type PostLike = { slotKey?: string; date?: Date; status: string; _id?: unknown };
export type WeekRow = { date: Date; slot: SlotLike; post: PostLike | null };

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function withPosts(
  week: { date: Date; slot: SlotLike }[],
  posts: PostLike[]
): WeekRow[] {
  return week.map(({ date, slot }) => ({
    date,
    slot,
    post: posts.find((p) => p.slotKey === slot.key && p.date && sameDay(new Date(p.date), date)) ?? null,
  }));
}

export async function todayView(now = new Date()) {
  await dbConnect();

  const slots = (await WeeklySlot.find().lean()) as unknown as SlotLike[];
  const buckets = await Bucket.find().lean();
  const targets = Object.fromEntries(buckets.map((b) => [b.key, b.targetPercent])) as Record<BucketKey, number>;

  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekPosts = (await Post.find({ date: { $gte: weekStart, $lt: weekEnd } }).lean()) as unknown as PostLike[];

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = await Post.find({ status: "posted", postedAt: { $gte: thirtyDaysAgo } }).lean();

  const prompts = await StoryPrompt.find().lean();

  return {
    todaySlot: slotForDate(now, slots),
    week: withPosts(weekSlots(now, slots), weekPosts),
    mix: computeMix(recent as { bucketKey: BucketKey }[], targets),
    buckets,
    captured: await Post.find({ status: "captured" }).sort({ createdAt: -1 }).lean(),
    storyPrompt: prompts.length ? prompts[Math.floor(Math.random() * prompts.length)].text : null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/lib/today.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the components and page**

`src/components/MixBar.tsx`:

```tsx
import type { MixRow } from "@/lib/mix";

const COLOR: Record<string, string> = {
  LIVING_IT: "bg-living", PEOPLE_LIVING_IT: "bg-people",
  THE_IDEA: "bg-idea", BEHIND_THE_WORLD: "bg-build",
};

export function MixBar({ rows }: { rows: MixRow[] }) {
  const any = rows.some((r) => r.count > 0);
  return (
    <div>
      <div className="flex h-9 overflow-hidden rounded">
        {rows.map((r) => (
          <div
            key={r.bucketKey}
            className={`${COLOR[r.bucketKey]} flex items-center justify-center text-xs font-semibold text-white`}
            style={{ flexGrow: any ? r.actualPercent || 0.5 : r.targetPercent }}
            title={`${r.bucketKey}: ${r.actualPercent}% of the last 30 days (target ${r.targetPercent}%)`}
          >
            {any ? `${r.actualPercent}%` : `${r.targetPercent}%`}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {any ? "Your last 30 days against the 40/25/20/15 target." : "Target mix — nothing posted yet."}
      </p>
    </div>
  );
}
```

`src/components/SlotCard.tsx`:

```tsx
import Link from "next/link";
import type { WeekRow } from "@/lib/today";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SlotCard({ row, isToday }: { row: WeekRow; isToday: boolean }) {
  const status = row.post?.status ?? "not started";
  return (
    <div className={`rounded border p-4 ${isToday ? "border-living ring-1 ring-living" : "border-stone-200"}`}>
      <p className="text-xs uppercase tracking-widest text-stone-500">
        {DAY[row.date.getDay()]} {row.date.getDate()}
      </p>
      <p className="mt-1 font-bold">{row.slot.bucketKey.replace(/_/g, " ")}</p>
      <p className="mt-0.5 text-xs text-stone-500">{row.slot.defaultSeriesKey.replace(/_/g, " ")}</p>
      <p className="mt-3 text-xs font-medium text-stone-600">{status}</p>
      {row.post ? (
        <Link href={`/post/${String(row.post._id)}`} className="mt-2 inline-block text-sm font-medium text-living underline">
          Open
        </Link>
      ) : (
        <form action="/api/posts" method="post" className="mt-2">
          <Link
            href={`/post/new?slot=${row.slot.key}&date=${row.date.toISOString()}`}
            className="text-sm font-medium text-living underline"
          >
            Write it
          </Link>
        </form>
      )}
    </div>
  );
}
```

`src/app/page.tsx`:

```tsx
import Link from "next/link";
import { todayView } from "@/lib/today";
import { MixBar } from "@/components/MixBar";
import { SlotCard } from "@/components/SlotCard";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const view = await todayView();
  const today = new Date();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-4 text-sm text-stone-600">
        {["captured", "proof", "coverage", "library", "calendar", "strategy"].map((r) => (
          <Link key={r} href={`/${r}`} className="capitalize hover:text-stone-900">{r}</Link>
        ))}
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">
        {view.todaySlot
          ? `Today you're posting ${view.todaySlot.bucketKey.replace(/_/g, " ")}`
          : "Nothing scheduled today"}
      </h1>
      {view.storyPrompt && (
        <p className="mt-3 rounded bg-stone-100 p-3 text-sm text-stone-700">Stories idea: {view.storyPrompt}</p>
      )}

      <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">This week</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {view.week.map((row) => (
          <SlotCard key={row.slot.key} row={row} isToday={row.date.toDateString() === today.toDateString()} />
        ))}
      </div>

      {view.captured.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">
            Captured ({view.captured.length})
          </h2>
          <ul className="divide-y divide-stone-200 rounded border border-stone-200">
            {view.captured.map((p) => (
              <li key={String(p._id)} className="p-3">
                <Link href={`/post/${String(p._id)}`} className="text-sm hover:underline">
                  <span className="mr-2 text-xs uppercase tracking-wider text-stone-500">
                    {String(p.bucketKey).replace(/_/g, " ")}
                  </span>
                  {String(p.rawNotes ?? "").slice(0, 90)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Your mix</h2>
      <MixBar rows={view.mix} />
    </main>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev`, sign in, open `http://localhost:3000`
Expected: today's assignment, four week cards, the mix bar showing the target mix, and a Stories idea.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add the Today dashboard"
```

---

### Task 11: The composer

**Files:**
- Create: `src/app/post/[id]/page.tsx`, `src/app/post/new/page.tsx`, `src/components/Composer.tsx`, `src/app/api/cards/route.ts`
- Test: none beyond the existing suite — this task is UI over already-tested logic. Verified in the browser.

**Interfaces:**
- Consumes: `/api/agent/draft`, `/api/posts`, `/api/posts/[id]`, `getTodaysCardCandidates`
- Produces: nothing other tasks consume.

- [ ] **Step 1: Write the cards endpoint**

`src/app/api/cards/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getTodaysCardCandidates } from "@/lib/wealthdaily/source";

export async function GET(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ cards: await getTodaysCardCandidates(60) });
}
```

- [ ] **Step 2: Write the composer component**

`src/components/Composer.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { CardCandidate, PlatformKey } from "@/types";

type Draft = {
  captions: string[]; hooks: string[]; cta: string;
  platformVariants: Record<PlatformKey, string>;
  suggestedVisual: string; storyVersion: string;
};

export function Composer({ postId, initialNotes, initialLens }: {
  postId: string; initialNotes: string; initialLens: "consumer" | "creator";
}) {
  const [cards, setCards] = useState<CardCandidate[]>([]);
  const [card, setCard] = useState<CardCandidate | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [lens, setLens] = useState(initialLens);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cards").then((r) => r.json()).then((d) => setCards(d.cards ?? [])).catch(() => setCards([]));
  }, []);

  async function generate() {
    setBusy(true); setError(null);
    const res = await fetch("/api/agent/draft", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, rawNotes: notes, lens, card }),
    });
    setBusy(false);
    const body = await res.json();
    if (!res.ok) { setError(body.error); return; }
    setDraft(body.draft);
    setChosen(body.draft.captions[0]);
  }

  async function markPosted() {
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chosenCaption: chosen }),
    });
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_posted", platforms: ["instagram"] }),
    });
    location.href = "/";
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <label className="text-xs font-semibold uppercase tracking-widest text-stone-500">The card you did</label>
        <select
          className="mt-2 w-full rounded border border-stone-300 p-2 text-sm"
          value={card?.activityId ?? ""}
          onChange={(e) => setCard(cards.find((c) => c.activityId === e.target.value) ?? null)}
        >
          <option value="">— no card, just a story —</option>
          {cards.map((c) => (
            <option key={c.activityId} value={c.activityId}>
              {c.productTitle}: {c.text.slice(0, 70)}
            </option>
          ))}
        </select>
        {cards.length === 0 && (
          <p className="mt-1 text-xs text-stone-500">
            No card list — Wealth Daily isn&apos;t connected. Write from scratch below.
          </p>
        )}
      </section>

      <section>
        <label className="text-xs font-semibold uppercase tracking-widest text-stone-500">What happened?</label>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
          placeholder="really didn't want to · trader joe's · guy teared up"
          className="mt-2 w-full rounded border border-stone-300 p-3 text-sm"
        />
      </section>

      <section className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Lens</span>
        {(["consumer", "creator"] as const).map((l) => (
          <button
            key={l} onClick={() => setLens(l)}
            className={`rounded px-3 py-1 text-sm ${lens === l ? "bg-stone-900 text-white" : "bg-stone-100"}`}
          >
            {l === "consumer" ? "Something you can LIVE" : "What YOUR audience could LIVE"}
          </button>
        ))}
      </section>

      <button onClick={generate} disabled={busy} className="rounded bg-living px-4 py-2 font-medium text-white disabled:opacity-50">
        {busy ? "Writing…" : draft ? "Write it again" : "Write the caption"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {draft && (
        <>
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Pick one, then edit it</p>
            <div className="mt-2 flex flex-col gap-2">
              {draft.captions.map((c, i) => (
                <button key={i} onClick={() => setChosen(c)}
                  className={`whitespace-pre-line rounded border p-3 text-left text-sm ${chosen === c ? "border-living bg-green-50" : "border-stone-200"}`}>
                  {c}
                </button>
              ))}
            </div>
            <textarea value={chosen} onChange={(e) => setChosen(e.target.value)} rows={10}
              className="mt-3 w-full whitespace-pre-line rounded border border-stone-300 p-3 text-sm" />
          </section>

          <section className="grid gap-3 text-sm sm:grid-cols-3">
            {(Object.keys(draft.platformVariants) as PlatformKey[]).map((p) => (
              <div key={p} className="rounded border border-stone-200 p-3">
                <p className="mb-1 text-xs uppercase tracking-wider text-stone-500">{p.replace("_", " / ")}</p>
                <p className="whitespace-pre-line">{draft.platformVariants[p]}</p>
              </div>
            ))}
          </section>

          <section className="rounded bg-stone-100 p-3 text-sm">
            <p><strong>Shoot this:</strong> {draft.suggestedVisual}</p>
            <p className="mt-2"><strong>Stories version:</strong> {draft.storyVersion}</p>
            <p className="mt-2"><strong>Ask:</strong> {draft.cta}</p>
          </section>

          <button onClick={markPosted} className="rounded bg-stone-900 px-4 py-2 font-medium text-white">
            Mark posted
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write the pages**

`src/app/post/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { Composer } from "@/components/Composer";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbConnect();
  const post = await Post.findById(id).lean();
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {String(post.bucketKey).replace(/_/g, " ")}
      </h1>
      <p className="mb-8 text-sm text-stone-500">{String(post.seriesKey ?? "").replace(/_/g, " ")}</p>
      <Composer
        postId={id}
        initialNotes={post.rawNotes ?? ""}
        initialLens={(post.lens as "consumer" | "creator") ?? "consumer"}
      />
    </main>
  );
}
```

`src/app/post/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import WeeklySlot from "@/models/WeeklySlot";

export const dynamic = "force-dynamic";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; date?: string }>;
}) {
  const { slot, date } = await searchParams;
  if (!slot) redirect("/");

  await dbConnect();
  const weeklySlot = await WeeklySlot.findOne({ key: slot }).lean();
  if (!weeklySlot) redirect("/");

  const post = await Post.create({
    slotKey: slot,
    date: date ? new Date(date) : new Date(),
    bucketKey: weeklySlot.bucketKey,
    seriesKey: weeklySlot.defaultSeriesKey,
    lens: weeklySlot.bucketKey === "BEHIND_THE_WORLD" ? "creator" : "consumer",
    status: "idea",
  });

  redirect(`/post/${String(post._id)}`);
}
```

- [ ] **Step 4: Verify the full loop in the browser**

Run: `npm run dev`, click "Write it" on today's slot, pick a card, type two lines of notes, press "Write the caption".
Expected: three captions appear, each structurally different; the CTA is one from the rotation; no caption contains "Comment below", "Download", or a feature announcement.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add the composer with card picker, lens and platform variants"
```

---

### Task 12: Command-line capture

**Files:**
- Create: `scripts/capture.ts`, `.claude/skills/live-it/SKILL.md`
- Modify: `src/app/captured/page.tsx` (create)
- Test: `tests/scripts/capture.test.ts`

**Interfaces:**
- Consumes: `classifyAndDraft`, `buildDraftContext`, `Post`
- Produces: `captureStory(text)` from `@/lib/capture`

- [ ] **Step 1: Write the failing test**

`tests/scripts/capture.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const classifyAndDraft = vi.fn();
const buildDraftContext = vi.fn();

vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/Post", () => ({ default: { create } }));
vi.mock("@/lib/agent/generate", () => ({ classifyAndDraft }));
vi.mock("@/lib/posts", () => ({ buildDraftContext }));

const CLASSIFIED = {
  bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", classificationReason: "her own evidence",
  captions: ["It started with picking up pennies."], hooks: ["h1", "h2", "h3"], cta: "Try this today.",
  platformVariants: { instagram: "i", linkedin: "l", facebook_threads: "f" },
  suggestedVisual: "photo of the coat pocket", storyVersion: "found $20 ✓",
};

describe("captureStory", () => {
  beforeEach(() => {
    create.mockReset(); classifyAndDraft.mockReset(); buildDraftContext.mockReset();
    buildDraftContext.mockResolvedValue({});
    classifyAndDraft.mockResolvedValue(CLASSIFIED);
    create.mockImplementation(async (doc) => ({ ...doc, _id: "post1" }));
  });

  it("saves the captured post with the classified bucket and series", async () => {
    const { captureStory } = await import("@/lib/capture");
    await captureStory("penny then $20");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", status: "captured" })
    );
  });

  it("stores the raw story and leaves the post unscheduled", async () => {
    const { captureStory } = await import("@/lib/capture");
    await captureStory("penny then $20");
    const doc = create.mock.calls[0][0];
    expect(doc.rawNotes).toBe("penny then $20");
    expect(doc.slotKey).toBeUndefined();
    expect(doc.date).toBeUndefined();
  });

  it("keeps the generated draft on the post", async () => {
    const { captureStory } = await import("@/lib/capture");
    await captureStory("penny then $20");
    expect(create.mock.calls[0][0].generations).toHaveLength(1);
  });

  it("returns the id, bucket and first caption for the terminal to print", async () => {
    const { captureStory } = await import("@/lib/capture");
    const out = await captureStory("penny then $20");
    expect(out.postId).toBe("post1");
    expect(out.bucketKey).toBe("LIVING_IT");
    expect(out.caption).toContain("pennies");
  });

  it("refuses an empty story rather than calling the model", async () => {
    const { captureStory } = await import("@/lib/capture");
    await expect(captureStory("   ")).rejects.toThrow("Tell me what happened");
    expect(classifyAndDraft).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/scripts/capture.test.ts`
Expected: FAIL — cannot resolve `@/lib/capture`.

- [ ] **Step 3: Write the capture library**

`src/lib/capture.ts`:

```typescript
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { buildDraftContext } from "@/lib/posts";
import { classifyAndDraft } from "@/lib/agent/generate";

export async function captureStory(story: string) {
  const rawNotes = story.trim();
  if (!rawNotes) throw new Error("Tell me what happened — the story is empty.");

  await dbConnect();

  // Classification needs a bucket to build a context from; LIVING_IT is the
  // most common and the model overrides it in its own response.
  const ctx = await buildDraftContext({
    bucketKey: "LIVING_IT",
    seriesKey: "TODAY_I_LIVED_IT",
    lens: "consumer",
    rawNotes,
  });

  const draft = await classifyAndDraft(ctx);

  const post = await Post.create({
    bucketKey: draft.bucketKey,
    seriesKey: draft.seriesKey,
    lens: draft.bucketKey === "BEHIND_THE_WORLD" ? "creator" : "consumer",
    rawNotes,
    status: "captured",
    cta: draft.cta,
    suggestedVisual: draft.suggestedVisual,
    storyVersion: draft.storyVersion,
    platformVariants: draft.platformVariants,
    generations: [{ ...draft, createdAt: new Date() }],
  });

  return {
    postId: String(post._id),
    bucketKey: draft.bucketKey,
    seriesKey: draft.seriesKey,
    reason: draft.classificationReason,
    caption: draft.captions[0],
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/scripts/capture.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the CLI and the skill**

`scripts/capture.ts`:

```typescript
import "dotenv/config";
import { captureStory } from "@/lib/capture";

async function main() {
  const story = process.argv.slice(2).join(" ");
  try {
    const out = await captureStory(story);
    console.log(`\n  bucket: ${out.bucketKey.replace(/_/g, " ")}`);
    console.log(`  series: ${out.seriesKey.replace(/_/g, " ")}`);
    console.log(`  why:    ${out.reason}\n`);
    console.log(out.caption);
    console.log(`\n  ✓ saved to Captured — open http://localhost:3000/post/${out.postId}\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n  ${(e as Error).message}\n`);
    process.exit(1);
  }
}

main();
```

`.claude/skills/live-it/SKILL.md`:

```markdown
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
the Captured inbox at http://localhost:3000 — nothing is scheduled.

If the command fails because `ANTHROPIC_API_KEY` or `MONGODB_URI` is unset,
say which one and stop; do not try to work around it.
```

- [ ] **Step 6: Write the Captured screen**

`src/app/captured/page.tsx`:

```tsx
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";

export const dynamic = "force-dynamic";

export default async function CapturedPage() {
  await dbConnect();
  const posts = await Post.find({ status: "captured" }).sort({ createdAt: -1 }).lean();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Captured</h1>
      <p className="mb-8 text-sm text-stone-500">
        Stories you sent from the command line. Nothing here is scheduled until you place it in a slot.
      </p>

      {posts.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-6 text-sm text-stone-500">
          Nothing captured yet. Try: <code>npm run live-it -- &quot;what just happened&quot;</code>
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={String(p._id)} className="rounded border border-stone-200 p-4">
              <p className="text-xs uppercase tracking-wider text-stone-500">
                {String(p.bucketKey).replace(/_/g, " ")} · {String(p.seriesKey ?? "").replace(/_/g, " ")}
              </p>
              <p className="mt-2 text-sm text-stone-700">{p.rawNotes}</p>
              <p className="mt-3 whitespace-pre-line border-l-2 border-stone-200 pl-3 text-sm">
                {p.generations?.[0]?.captions?.[0] ?? ""}
              </p>
              <Link href={`/post/${String(p._id)}`} className="mt-3 inline-block text-sm font-medium text-living underline">
                Open and place it
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 7: Verify the capture path end to end**

With the dev server **stopped**, run:
`npm run live-it -- "picked up a penny on the walk with Lolo, found a twenty in my coat pocket an hour later"`
Expected: prints `bucket: LIVING IT`, a reason, and a caption. Then start `npm run dev` and confirm the post appears at `/captured` and on the Today screen.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add command-line story capture with a /live-it skill"
```

---

### Task 13: Library, Strategy, Proof, Coverage and Calendar

**Files:**
- Create: `src/app/library/page.tsx`, `src/app/strategy/page.tsx`, `src/app/proof/page.tsx`, `src/app/coverage/page.tsx`, `src/app/calendar/page.tsx`, `src/components/EditableList.tsx`
- Test: none beyond the existing suite — these read already-tested functions. Verified in the browser.

**Interfaces:**
- Consumes: models, `getProofCandidates`, `getCoverageGaps`, `postedProductIds`, `/api/strategy`
- Produces: nothing other tasks consume.

- [ ] **Step 1: Write the Library page**

`src/app/library/page.tsx`:

```tsx
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Bucket from "@/models/Bucket";
import Series from "@/models/Series";
import StrategyProfile from "@/models/StrategyProfile";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await dbConnect();
  const [buckets, series, profile] = await Promise.all([
    Bucket.find().sort({ targetPercent: -1 }).lean(),
    Series.find().lean(),
    StrategyProfile.findOne({ singleton: "the-one" }).lean(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 mb-8 text-2xl font-bold tracking-tight">Library</h1>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Buckets</h2>
      <div className="mb-10 flex flex-col gap-4">
        {buckets.map((b) => (
          <div key={b.key} className="rounded border border-stone-200 p-4">
            <p className="font-bold">{b.name} <span className="text-stone-400">· {b.targetPercent}%</span></p>
            <p className="mt-1 text-sm text-stone-600">{b.description}</p>
            <p className="mt-2 text-xs text-stone-500">NOT: {b.whatItIsNot}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Series</h2>
      <div className="mb-10 flex flex-col gap-4">
        {series.map((s) => (
          <div key={s.key} className="rounded border border-stone-200 p-4">
            <p className="font-bold">{s.name}</p>
            <p className="mt-1 text-xs text-stone-500">{s.structureSkeleton}</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-stone-600">
              {s.promptQuestions?.map((q: string) => <li key={q}>{q}</li>)}
            </ul>
            {s.examples?.map((e: string, i: number) => (
              <p key={i} className="mt-3 whitespace-pre-line border-l-2 border-stone-200 pl-3 text-sm">{e}</p>
            ))}
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Pinned posts</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        {profile?.pinnedPosts?.map((p: { title: string; brief: string }) => (
          <div key={p.title} className="rounded border border-stone-200 p-4">
            <p className="text-sm font-bold">{p.title}</p>
            <p className="mt-1 text-xs text-stone-600">{p.brief}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Bio</h2>
      <p className="text-sm text-stone-700">{profile?.profileBio}</p>
    </main>
  );
}
```

- [ ] **Step 2: Write the editable list component and Strategy page**

`src/components/EditableList.tsx`:

```tsx
"use client";

import { useState } from "react";

export function EditableList({ label, field, initial }: { label: string; field: string; initial: string[] }) {
  const [lines, setLines] = useState(initial.join("\n"));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setState("saving");
    await fetch("/api/strategy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: lines.split("\n").map((l) => l.trim()).filter(Boolean) }),
    });
    setState("saved");
  }

  return (
    <section className="mb-8">
      <label className="text-xs font-semibold uppercase tracking-widest text-stone-500">{label}</label>
      <textarea
        value={lines}
        onChange={(e) => { setLines(e.target.value); setState("idle"); }}
        rows={Math.min(16, initial.length + 3)}
        className="mt-2 w-full rounded border border-stone-300 p-3 font-mono text-xs"
      />
      <button onClick={save} disabled={state === "saving"} className="mt-2 rounded bg-stone-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save"}
      </button>
      <p className="mt-1 text-xs text-stone-500">One per line. Every future draft uses these.</p>
    </section>
  );
}
```

`src/app/strategy/page.tsx`:

```tsx
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import StrategyProfile from "@/models/StrategyProfile";
import { EditableList } from "@/components/EditableList";

export const dynamic = "force-dynamic";

export default async function StrategyPage() {
  await dbConnect();
  const profile = await StrategyProfile.findOne({ singleton: "the-one" }).lean();
  if (!profile) {
    return <main className="p-10">Run <code>npm run seed</code> first.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Strategy</h1>
      <p className="mb-8 text-sm text-stone-500">
        This is what the agent knows. Change it here and every future draft changes with it.
      </p>

      <section className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">The one story</p>
        <p className="mt-2 rounded border-l-2 border-living bg-white p-4 text-sm">{profile.oneStory}</p>
      </section>

      <EditableList label="Voice rules" field="voiceRules" initial={profile.voiceRules ?? []} />
      <EditableList label="Never do this" field="doNotList" initial={profile.doNotList ?? []} />
      <EditableList label="CTA rotation" field="ctaRotation" initial={profile.ctaRotation ?? []} />
      <EditableList label="Opener bank" field="openerBank" initial={profile.openerBank ?? []} />
    </main>
  );
}
```

- [ ] **Step 3: Write the Proof, Coverage and Calendar pages**

`src/app/proof/page.tsx`:

```tsx
import Link from "next/link";
import { getProofCandidates } from "@/lib/wealthdaily/source";
import { isConnected } from "@/lib/wealthdaily/client";

export const dynamic = "force-dynamic";

export default async function ProofPage() {
  const proof = await getProofCandidates();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Proof</h1>
      <p className="mb-8 text-sm text-stone-500">
        Published testimonials — people gave these to you to publish. Thursday&apos;s material.
      </p>

      {!isConnected() && (
        <p className="mb-6 rounded border border-stone-300 bg-stone-100 p-4 text-sm text-stone-600">
          Wealth Daily isn&apos;t connected, so there&apos;s nothing to list. Set WEALTH_DAILY_DATABASE_URL.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {proof.map((p, i) => (
          <li key={i} className="rounded border border-stone-200 p-4">
            <p className="text-sm">“{p.quote}”</p>
            <p className="mt-2 text-xs text-stone-500">{p.name}{p.detail ? ` · ${p.detail}` : ""}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`src/app/coverage/page.tsx`:

```tsx
import Link from "next/link";
import { getCoverageGaps, getDeckCatalogue } from "@/lib/wealthdaily/source";
import { postedProductIds } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const [all, gaps] = await Promise.all([getDeckCatalogue(), getCoverageGaps(await postedProductIds())]);
  const gapIds = new Set(gaps.map((g) => g.productId));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Coverage</h1>
      <p className="mb-8 text-sm text-stone-500">
        Everything you&apos;ve made, and whether you&apos;ve ever posted about it.
      </p>

      <ul className="divide-y divide-stone-200 rounded border border-stone-200">
        {all.map((d) => (
          <li key={d.productId} className="flex items-center justify-between p-3 text-sm">
            <span>{d.title} <span className="text-stone-400">· {d.cardCount} cards</span></span>
            <span className={gapIds.has(d.productId) ? "text-red-700" : "text-living"}>
              {gapIds.has(d.productId) ? "never posted" : "covered"}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`src/app/calendar/page.tsx`:

```tsx
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";

export const dynamic = "force-dynamic";

const COLOR: Record<string, string> = {
  LIVING_IT: "bg-living", PEOPLE_LIVING_IT: "bg-people",
  THE_IDEA: "bg-idea", BEHIND_THE_WORLD: "bg-build",
};

export default async function CalendarPage() {
  await dbConnect();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const posts = await Post.find({ date: { $gte: start, $lt: end } }).lean();
  const days = Array.from({ length: end.getDate() === 1 ? new Date(end.getTime() - 1).getDate() : 31 }, (_, i) => i + 1);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 mb-8 text-2xl font-bold tracking-tight">
        {start.toLocaleString("en", { month: "long", year: "numeric" })}
      </h1>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const post = posts.find((p) => p.date && new Date(p.date).getDate() === day);
          return (
            <div key={day} className="aspect-square rounded border border-stone-200 p-1 text-xs">
              <span className="text-stone-400">{day}</span>
              {post && (
                <Link href={`/post/${String(post._id)}`}>
                  <span className={`mt-1 block h-2 rounded ${COLOR[String(post.bucketKey)] ?? "bg-stone-400"}`} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; every test passes.

- [ ] **Step 5: Walk the success criteria**

Confirm each of the five criteria in spec §13:

1. Open `/` — it states what to post today without asking anything.
2. Write a Monday post — the draft names a real card from a real deck.
3. Stop the dev server, run `npm run live-it -- "..."`, restart, see it in Captured.
4. Read the generated captions — no feature announcement, no platform-instruction CTA.
5. Comment out `WEALTH_DAILY_DATABASE_URL` in `.env.local`, restart, visit every screen — all render, card picker degrades to free text.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add library, strategy, proof, coverage and calendar screens"
```

---

## Self-Review

**Spec coverage.** §3 one story → Task 4. §4 domain model → Task 2. §5 voice and craft rules → Task 4 (seeded) and Task 7 (rendered into the prompt). §6 agent → Tasks 7–8. §7 data source → Task 6. §8 screens → Tasks 5, 10, 11, 12, 13. §9 CLI → Task 12. §10 auth → Task 5. §11 stack and env → Task 1. §12 testing → distributed; every listed test exists. §13 success criteria → Task 13 Step 5. No gap found.

**Placeholders.** None. Every code step carries the actual content.

**Type consistency.** `SlotLike` is defined in Task 3 and used in Task 10. `DraftContext` is defined in Task 7 and consumed in Tasks 8, 9 and 12. `CardCandidate` is defined in Task 2 and used in Tasks 6, 7 and 11. `buildDraftContext` keeps the same signature in Tasks 9, 8 and 12. Bucket, series, status and platform key strings match the Global Constraints everywhere they appear.

**One inconsistency found and fixed inline:** `postedProductIds()` originally returned activity ids while `getCoverageGaps()` compared against product ids, so Coverage would have reported every deck as never-posted. `CardCandidate` now carries `productId`, the card query selects it, `Post.sourceCardRef` stores it, and `postedProductIds()` reads it.
