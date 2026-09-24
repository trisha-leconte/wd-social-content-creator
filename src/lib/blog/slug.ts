// Dropped so a slug reads as keywords rather than a sentence. Deliberately
// short — removing too much makes slugs ambiguous.
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "how",
  "if", "in", "into", "is", "it", "of", "on", "or", "our", "that", "the",
  "their", "then", "there", "these", "this", "to", "was", "were", "will",
  "with", "your",
]);

const MAX_LENGTH = 60;

export function slugify(title: string): string {
  const words = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // fold accents
    .toLowerCase()
    .replace(/['']/g, "") // don't -> dont, not don-t
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

  let slug = "";
  for (const word of words) {
    const next = slug ? `${slug}-${word}` : word;
    if (next.length > MAX_LENGTH) break;
    slug = next;
  }
  return slug;
}
