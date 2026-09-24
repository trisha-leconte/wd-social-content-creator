import { z } from "zod";
import { SEARCH_INTENTS } from "@/models/BlogPost";

export const OutlineSchema = z.object({
  targetKeyword: z.string().min(2),
  secondaryKeywords: z.array(z.string()),
  searchIntent: z.enum(SEARCH_INTENTS),
  titleOptions: z.array(z.string()).length(3),
  // Google truncates around 160; under 120 wastes the slot.
  metaDescription: z.string().min(120).max(165),
  outline: z
    .array(
      z.object({
        heading: z.string().min(3),
        level: z.union([z.literal(2), z.literal(3)]),
        notes: z.string(),
      })
    )
    .min(3),
  sourceRefs: z.array(
    z.object({ kind: z.enum(["card", "product"]), title: z.string(), detail: z.string() })
  ),
  internalLinks: z.array(z.object({ label: z.string(), url: z.string() })),
  estimatedWords: z.number().int().positive(),
});

export const ArticleSchema = z.object({
  bodyMarkdown: z.string().min(400),
  wordCount: z.number().int().positive(),
});

export type Article = z.infer<typeof ArticleSchema>;
