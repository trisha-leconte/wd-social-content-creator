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

/**
 * Card text carries personalisation tokens the reader's app fills in:
 * `{{partner|Them}}`, `{{first_name|friend}}`, `{{author_website}}`.
 * Resolve them here, or the agent writes the raw braces into a caption.
 */
export function resolveTokens(text: string): string {
  return text.replace(/\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g, (_, key: string, fallback?: string) =>
    fallback && fallback.length > 0 ? fallback : key.replace(/_/g, " ")
  );
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
    text: resolveTokens(text),
    productTitle: row.product_title,
    chapterTitle: chapter === "" ? null : resolveTokens(chapter),
  };
}
