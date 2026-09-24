import { sql } from "./client";
import { mapCardRow, i18n, type CardRow } from "./map";
import type { CardCandidate } from "@/types";

export type Shipped = { id: string; title: string; isNew: boolean; featured: boolean; comingSoon: boolean };
export type Deck = { productId: string; title: string; cardCount: number; slug: string };
export type Proof = { quote: string; name: string; detail: string | null };
export type AuthorSignal = { name: string; productTitle: string };

/** Real card text, grouped by book. Deck-style activities only. */
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
  const rows = await db<{ product_id: string; title: string; slug: string; card_count: string }[]>`
    SELECT p.id AS product_id, p.title, p.slug, count(a.id) AS card_count
    FROM products p
    LEFT JOIN activities a ON a.product_id = p.id AND a.is_active = true
    WHERE p.status = 'published'
    GROUP BY p.id, p.title, p.slug
    ORDER BY p.title
  `;
  return rows.map((r) => ({
    productId: r.product_id,
    title: r.title,
    slug: r.slug,
    cardCount: Number(r.card_count),
  }));
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
