import type { Deck } from "@/lib/wealthdaily/source";
import type { BlogAudience } from "@/models/BlogPost";

export type BlogIdea = {
  productId: string;
  topic: string;
  audience: BlogAudience;
  why: string;
};

/**
 * There is no keyword tool, so the idea source is the catalogue itself.
 * These angles map to searches people demonstrably make about books —
 * summaries, exercises, whether it is worth reading — and Trisha is one of
 * very few people who can answer them with the actual exercises.
 */
const ANGLES: {
  topic: (title: string) => string;
  audience: BlogAudience;
  why: (d: Deck) => string;
}[] = [
  {
    topic: (t) => `${t}: a summary that ends with something to do`,
    audience: "book_searcher",
    why: (d) =>
      `People search for summaries of ${d.title} constantly. Almost every result recaps it. You have ${d.cardCount} real exercises to end on instead.`,
  },
  {
    topic: (t) => `The exercises in ${t}, and what happens when you actually do them`,
    audience: "book_searcher",
    why: (d) =>
      `Nobody ranking for ${d.title} has the exercises. You have ${d.cardCount} of them, already written.`,
  },
  {
    topic: (t) => `What changed when I spent 30 days practising ${t}`,
    audience: "reader",
    why: (d) => `Your own evidence from ${d.title}. First-hand, which no summary site can copy.`,
  },
  {
    topic: (t) => `How I turned ${t} into a daily practice`,
    audience: "creator",
    why: (d) =>
      `Shows authors exactly what you do with a book. ${d.title} is a worked example they can picture their own book inside.`,
  },
];

export function mineIdeas(decks: Deck[]): BlogIdea[] {
  return decks
    .filter((d) => d.cardCount > 0)
    .flatMap((d) =>
      ANGLES.map((a) => ({
        productId: d.productId,
        topic: a.topic(d.title),
        audience: a.audience,
        why: a.why(d),
      }))
    );
}
