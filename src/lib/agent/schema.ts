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

/**
 * Classification only, for the CLI, where the bucket is not known up front.
 * Deliberately separate from writing: asking one call to both classify and
 * write means the prompt must be built before the series is known, which
 * primed the wrong skeleton and produced invented detail.
 */
export const ClassificationSchema = z.object({
  bucketKey: z.enum(BUCKET_KEYS),
  seriesKey: z.enum(SERIES_KEYS),
  reason: z.string(),
});

export type Classification = z.infer<typeof ClassificationSchema>;
